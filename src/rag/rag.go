package rag

import (
	"ai-agent-go/src/config"
	"ai-agent-go/src/db"
	"ai-agent-go/src/utils"
	"context"
	"fmt"
	"log"
	"os"

	"path/filepath"

	embeddingArk "github.com/cloudwego/eino-ext/components/embedding/ark"
	embeddingOllama "github.com/cloudwego/eino-ext/components/embedding/ollama"
	redisIndexer "github.com/cloudwego/eino-ext/components/indexer/redis"
	redisRetriever "github.com/cloudwego/eino-ext/components/retriever/redis"
	"github.com/cloudwego/eino/components/embedding"
	"github.com/cloudwego/eino/components/retriever"
	"github.com/cloudwego/eino/schema"
	"github.com/redis/go-redis/v9"
)



type RagIndexer struct {
	embedder embedding.Embedder
	indexer  *redisIndexer.Indexer
}

type RagQuery struct {
	embedder  embedding.Embedder
	retriever retriever.Retriever
}

func createEmbedder(ctx context.Context) (embedding.Embedder, error) {
	cfg := config.Get()
	var (
		aiConfig = cfg.AiConfig
		ragConfig = cfg.RagConfig
	)
	switch aiConfig.Provider {
	case config.PROVIDER_OPENAI:
		{
			arkConfig := &embeddingArk.EmbeddingConfig{
				BaseURL: aiConfig.BaseUrl,
				APIKey:  aiConfig.ApiKey,
				Model:   ragConfig.EmbeddingModel,
			}
			return embeddingArk.NewEmbedder(ctx, arkConfig)
		}
	default:
		fallthrough
	case config.PROVIDER_OLLAMA:
		{
			ollamaConfig := &embeddingOllama.EmbeddingConfig{
				BaseURL: aiConfig.BaseUrl,
				Model:   ragConfig.EmbeddingModel,
			}
			return embeddingOllama.NewEmbedder(ctx, ollamaConfig)
		}
	}
}

type Doc2hashes func(context.Context, *schema.Document) (*redisIndexer.Hashes, error)

func getDoc2hashes(filename string) Doc2hashes {
	return func(ctx context.Context, doc *schema.Document) (*redisIndexer.Hashes, error) {
		source := ""
		if s, ok := doc.MetaData["source"].(string); ok {
			source = s
		}
		return &redisIndexer.Hashes{
			Key: fmt.Sprintf("%s:%s", filename, doc.ID),
			Field2Value: map[string]redisIndexer.FieldValue{
				"content":  {Value: doc.Content, EmbedKey: "vector"},
				"metadata": {Value: source},
			},
		}, nil
	}
}

func NewRagIndexer(filename string) (*RagIndexer, error) {
	ctx := context.Background()
	embedder, err := createEmbedder(ctx)
	if err != nil {
		return nil, fmt.Errorf("create embedder error: %v\n", err)
	}
	if err := db.InitRedisIndex(ctx, filename); err != nil {
		return nil, fmt.Errorf("initialize redis index error: %v\n", err)
	}
	rdb := db.GetRdb()
	indexerConfig := &redisIndexer.IndexerConfig{
		Client:           rdb,
		KeyPrefix:        utils.GetIndexNamePrefix(filename),
		BatchSize:        10,
		DocumentToHashes: getDoc2hashes(filename),
	}
	indexerConfig.Embedding = embedder
	indexer, err := redisIndexer.NewIndexer(ctx, indexerConfig)
	if err != nil {
		return nil, fmt.Errorf("create indexer error: %v\n", err)
	}
	return &RagIndexer{
		embedder: embedder,
		indexer:  indexer,
	}, nil
}

func DeleteIndex(ctx context.Context, filename string) error {
	if err := db.DeleteRedisIndex(ctx, filename); err != nil {
		return fmt.Errorf("delete redis index error: %v\n", err)
	}
	return nil
}

func NewRagQueries(ctx context.Context, username string) ([]*RagQuery, error) {
	embedder, err := createEmbedder(ctx)
	if err != nil {
		return nil, fmt.Errorf("create embedder error: %v\n", err)
	}
	uploadDir := filepath.Join("uploads", username)
	files, err := os.ReadDir(uploadDir)
	if err != nil || len(files) == 0 {
		return nil, fmt.Errorf("uploaded files not found for user %s\n", username)
	}
	getRagQueryByFilename := getRagQueryByFilenameHof(ctx, &embedder)
	ragQueries := []*RagQuery{}
	for _, f := range files {
		if !f.IsDir() {
			ragQuery, err := getRagQueryByFilename(f.Name())
			if err != nil {
				log.Printf("rag query by filename error: %v\n", err)
			} else {
				ragQueries = append(ragQueries, ragQuery)
			}
		}
	}
	if len(ragQueries) == 0 {
		return nil, fmt.Errorf("validate file not found for user %s\n", username)
	}
	return ragQueries, nil
}

func documentConverter(ctx context.Context, redisDoc redis.Document) (*schema.Document, error) {
	doc := &schema.Document{
		ID:       redisDoc.ID,
		Content:  "",
		MetaData: map[string]any{},
	}
	for field, val := range redisDoc.Fields {
		if field == "content" {
			doc.Content = val
		} else {
			doc.MetaData[field] = val
		}
	}
	return doc, nil
}

type RagQueryByFilename func(filename string) (*RagQuery, error)

// Hof: Higher-Order Function
func getRagQueryByFilenameHof(ctx context.Context, embedder *embedding.Embedder) RagQueryByFilename {
	return func(filename string) (*RagQuery, error) {
		indexName := utils.GetIndexName(filename)
		retrieverConfig := &redisRetriever.RetrieverConfig{
			Client:            db.GetRdb(),
			Index:             indexName,
			Dialect:           2,
			ReturnFields:      []string{"content", "metadata", "distance"},
			TopK:              5,
			VectorField:       "vector",
			DocumentConverter: documentConverter,
		}
		retrieverConfig.Embedding = *embedder
		r, err := redisRetriever.NewRetriever(ctx, retrieverConfig)
		if err != nil {
			return nil, fmt.Errorf("create retriever error: %v\n", err)
		}
		return &RagQuery{
			embedder:  *embedder,
			retriever: r,
		}, nil
	}
}

func (r *RagQuery) RetrieveDocuments(ctx context.Context, query string) ([]*schema.Document, error) {
	docs, err := r.retriever.Retrieve(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("retrieve documents error: %v\n", err)
	}
	return docs, nil
}

func BuildRagPrompt(userMessage string, docs []*schema.Document) string {
	if len(docs) == 0 {
		return userMessage
	}
	contextText := ""
	for i, doc := range docs {
		contextText += fmt.Sprintf("[Document %d]: %s\n\n", i+1, doc.Content)
	}
	prompt := fmt.Sprintf(`
Answer the user's question based on the following reference document. If the document does not contain the relevant information, please state that the information could not be found.

Reference Document:
%s

User Question: %s

Please provide an accurate and complete answer:`, contextText, userMessage)
	return prompt
}

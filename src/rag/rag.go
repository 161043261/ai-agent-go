package rag

import (
	"ai-agent-go/src/config"
	"ai-agent-go/src/db"
	"ai-agent-go/src/utils"
	"context"
	"fmt"

	embeddingArk "github.com/cloudwego/eino-ext/components/embedding/ark"
	embeddingOllama "github.com/cloudwego/eino-ext/components/embedding/ollama"
	redisIndexer "github.com/cloudwego/eino-ext/components/indexer/redis"
	redisRetriever "github.com/cloudwego/eino-ext/components/retriever/redis"
	"github.com/cloudwego/eino/components/embedding"
	"github.com/cloudwego/eino/components/retriever"
	"github.com/cloudwego/eino/schema"
)

const (
	PROVIDER_OLLAMA = "ollama"
	PROVIDER_OPENAI = "openai"
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
	aiCfg := config.Get().AiConfig
	ragConfig := config.Get().RagConfig
	switch aiCfg.Provider {
	case PROVIDER_OPENAI:
		{
			arkConfig := &embeddingArk.EmbeddingConfig{
				BaseURL: aiCfg.BaseUrl,
				APIKey:  aiCfg.ApiKey,
				Model:   ragConfig.EmbeddingModel,
			}
			return embeddingArk.NewEmbedder(ctx, arkConfig)
		}
	default:
		fallthrough
	case PROVIDER_OLLAMA:
		{
			ollamaConfig := &embeddingOllama.EmbeddingConfig{
				BaseURL: aiCfg.BaseUrl,
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
		return nil, fmt.Errorf("create embedder error: %v", err)
	}
	if err := db.InitRedisIndex(ctx, filename); err != nil {
		return nil, fmt.Errorf("initialize redis index error: %v", err)
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
		return nil, fmt.Errorf("create indexer error: %v", err)
	}
	return &RagIndexer{
		embedder: embedder,
		indexer:  indexer,
	}, nil
}

func DeleteIndex(ctx context.Context, )

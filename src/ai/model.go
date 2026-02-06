package ai

import (
	"ai-agent-go/src/config"
	"ai-agent-go/src/rag"
	"ai-agent-go/src/utils"
	"context"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/cloudwego/eino-ext/components/model/ollama"
	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/mark3labs/mcp-go/mcp"
)

const (
	OPENAI_MODEL     = "openai"
	OLLAMA_MODEL     = "ollama"
	OPENAI_RAG_MODEL = "openai-rag"
	OLLAMA_RAG_MODEL = "ollama-rag"
	OPENAI_MCP_MODEL = "openai-mcp"
	OLLAMA_MCP_MODEL = "ollama-mcp"
)

type StreamCallback func(msg string)

type AiModel interface {
	Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error)
	ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error)
	GetModelType() string
}

type OpenaiModel struct {
	llm model.ToolCallingChatModel
}

// GetModelType implements [AiModel].
func (this *OpenaiModel) GetModelType() string {
	return OPENAI_MODEL
}

// Response implements [AiModel].
func (this *OpenaiModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	res, err := this.llm.Generate(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("openai model response error: %v\n", err)
	}
	return res, nil
}

// ResponseStream implements [AiModel].
func (this *OpenaiModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	stream, err := this.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("openai model response stream error: %v\n", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fullContent.String(), fmt.Errorf("openai model response stream receive error: %v\n", err)
		}
		if len(msg.Content) > 0 {
			cb(msg.Content)
			fullContent.WriteString(msg.Content)
		}
	}
	return fullContent.String(), nil
}

type OllamaModel struct {
	llm model.ToolCallingChatModel
}

// GetModelType implements [AiModel].
func (this *OllamaModel) GetModelType() string {
	return OLLAMA_MODEL
}

// Response implements [AiModel].
func (this *OllamaModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages is empty\n")
	}
	res, err := this.llm.Generate(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("ollama model response error: %v\n", err)
	}
	return res, nil
}

// ResponseStream implements [AiModel].
func (this *OllamaModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	stream, err := this.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("ollama model response stream error: %v\n", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fullContent.String(), fmt.Errorf("ollama model response stream receive error: %v\n", err)
		}
		if len(msg.Content) > 0 {
			cb(msg.Content)
			fullContent.WriteString(msg.Content)
		}
	}
	return fullContent.String(), nil
}

var _ AiModel = (*OpenaiModel)(nil)

func NewOpenaiModel(ctx context.Context) (*OpenaiModel, error) {
	aiConfig := config.Get().AiConfig
	llm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL: aiConfig.BaseUrl,
		Model:   aiConfig.ModelName,
		APIKey:  aiConfig.ApiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("create openai model error: %v\n", err)
	}
	return &OpenaiModel{llm}, nil
}

var _ AiModel = (*OllamaModel)(nil)

func NewOllamaModel(ctx context.Context) (*OllamaModel, error) {
	aiConfig := config.Get().AiConfig
	llm, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
		BaseURL: aiConfig.BaseUrl,
		Model:   aiConfig.ModelName,
	})
	if err != nil {
		return nil, fmt.Errorf("create ollama model error: %v\n", err)
	}
	return &OllamaModel{llm}, nil
}

type OpenaiRagModel struct {
	llm      model.ToolCallingChatModel
	username string
}

// GetModelType implements [AiModel].
func (this *OpenaiRagModel) GetModelType() string {
	return OPENAI_RAG_MODEL
}

// Response implements [AiModel].
func (this *OpenaiRagModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages is empty\n")
	}
	ragQueries, err := rag.NewRagQueries(ctx, this.username)
	if err != nil {
		log.Printf("Create RAG queries error: %v, user may not have uploaded any files\n", err)
		// Fallback
		resp, err := this.llm.Generate(ctx, messages)
		if err != nil {
			return nil, fmt.Errorf("openai rag model response error: %v\n", err)
		}
		return resp, nil
	}
	latestContent := messages[len(messages)-1].Content
	allDocs := []*schema.Document{}
	for _, ragQuery := range ragQueries {
		if docs, err := ragQuery.RetrieveDocuments(ctx, latestContent); err != nil {
			log.Printf("Retrieve documents error: %v\n", err)
		} else {
			allDocs = append(allDocs, docs...)
		}
	}
	if len(allDocs) == 0 {
		// Fallback
		resp, err := this.llm.Generate(ctx, messages)
		if err != nil {
			return nil, fmt.Errorf("openai rag model response error: %v\n", err)
		}
		return resp, nil
	}
	ragPrompt := rag.BuildRagPrompt(latestContent, allDocs)
	newMessages := make([]*schema.Message, len(messages))
	copy(newMessages, messages)
	newMessages[len(newMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: ragPrompt,
	}
	resp, err := this.llm.Generate(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("openai rag model response error: %v\n", err)
	}
	return resp, nil
}

// ResponseStream implements [AiModel].
func (this *OpenaiRagModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	ragQueries, err := rag.NewRagQueries(ctx, this.username)
	if err != nil {
		log.Printf("Create RAG queries error, user may not have uploaded any files: %v\n", err)
		return this.doResponseStream(ctx, messages, cb)
	}
	latestContent := messages[len(messages)-1].Content
	allDocs := []*schema.Document{}
	for _, ragQuery := range ragQueries {
		if docs, err := ragQuery.RetrieveDocuments(ctx, latestContent); err != nil {
			log.Printf("Retrieve documents error: %v\n", err)
		} else {
			allDocs = append(allDocs, docs...)
		}
	}
	if len(allDocs) == 0 {
		// Fallback
		return this.doResponseStream(ctx, messages, cb)
	}
	ragPrompt := rag.BuildRagPrompt(latestContent, allDocs)
	newMessages := make([]*schema.Message, len(messages))
	copy(newMessages, messages)
	newMessages[len(newMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: ragPrompt,
	}
	return this.doResponseStream(ctx, newMessages, cb)
}

func (this *OpenaiRagModel) doResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	stream, err := this.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("openai rag model response stream error: %v\n", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fullContent.String(), fmt.Errorf("openai rag model response stream receive error: %v\n", err)
		}
		if len(msg.Content) > 0 {
			fullContent.WriteString(msg.Content)
			cb(msg.Content)
		}
	}
	return fullContent.String(), nil
}

var _ AiModel = (*OpenaiRagModel)(nil)

func NewOpenaiRagModel(ctx context.Context, username string) (*OpenaiRagModel, error) {
	aiConfig := config.Get().AiConfig
	llm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL: aiConfig.BaseUrl,
		Model:   aiConfig.ModelName,
		APIKey:  aiConfig.ApiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("create openai rag model error: %v\n", err)
	}
	return &OpenaiRagModel{llm, username}, nil
}

type OllamaRagModel struct {
	llm      model.ToolCallingChatModel
	username string
}

// GetModelType implements [AiModel].
func (this *OllamaRagModel) GetModelType() string {
	return OLLAMA_RAG_MODEL
}

// Response implements [AiModel].
func (this *OllamaRagModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages is empty\n")
	}
	ragQueries, err := rag.NewRagQueries(ctx, this.username)
	if err != nil {
		log.Printf("Create RAG queries error: %v, user may not have uploaded any files\n", err)
		// Fallback
		resp, err := this.llm.Generate(ctx, messages)
		if err != nil {
			return nil, fmt.Errorf("ollama rag model response error: %v\n", err)
		}
		return resp, nil
	}
	latestContent := messages[len(messages)-1].Content
	allDocs := []*schema.Document{}
	for _, ragQuery := range ragQueries {
		if docs, err := ragQuery.RetrieveDocuments(ctx, latestContent); err != nil {
			log.Printf("Retrieve documents error: %v\n", err)
		} else {
			allDocs = append(allDocs, docs...)
		}
	}
	if len(allDocs) == 0 {
		// Fallback
		resp, err := this.llm.Generate(ctx, messages)
		if err != nil {
			return nil, fmt.Errorf("ollama rag model response error: %v\n", err)
		}
		return resp, nil
	}
	ragPrompt := rag.BuildRagPrompt(latestContent, allDocs)
	newMessages := make([]*schema.Message, len(messages))
	copy(newMessages, messages)
	newMessages[len(newMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: ragPrompt,
	}
	resp, err := this.llm.Generate(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("ollama rag model response error: %v\n", err)
	}
	return resp, nil
}

// ResponseStream implements [AiModel].
func (this *OllamaRagModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	ragQueries, err := rag.NewRagQueries(ctx, this.username)
	if err != nil {
		log.Printf("Create RAG queries error: %v, user may not have uploaded any files\n", err)
		return this.doResponseStream(ctx, messages, cb)
	}
	latestContent := messages[len(messages)-1].Content
	allDocs := []*schema.Document{}
	for _, ragQuery := range ragQueries {
		if docs, err := ragQuery.RetrieveDocuments(ctx, latestContent); err != nil {
			log.Printf("Retrieve documents error: %v\n", err)
		} else {
			allDocs = append(allDocs, docs...)
		}
	}
	if len(allDocs) == 0 {
		// Fallback
		return this.doResponseStream(ctx, messages, cb)
	}
	ragPrompt := rag.BuildRagPrompt(latestContent, allDocs)
	newMessages := make([]*schema.Message, len(messages))
	copy(newMessages, messages)
	newMessages[len(newMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: ragPrompt,
	}
	return this.doResponseStream(ctx, newMessages, cb)
}

func (this *OllamaRagModel) doResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	stream, err := this.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("ollama rag model response stream error: %v\n", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fullContent.String(), fmt.Errorf("ollama rag model response stream receive error: %v\n", err)
		}
		if len(msg.Content) > 0 {
			fullContent.WriteString(msg.Content)
			cb(msg.Content)
		}
	}
	return fullContent.String(), nil
}

var _ AiModel = (*OllamaRagModel)(nil)

func NewOllamaRagModel(ctx context.Context, username string) (*OllamaRagModel, error) {
	aiCfg := config.Get().AiConfig
	llm, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
		BaseURL: aiCfg.BaseUrl,
		Model:   aiCfg.ModelName,
	})
	if err != nil {
		return nil, fmt.Errorf("create ollama rag model error: %v\n", err)
	}
	return &OllamaRagModel{llm, username}, nil
}

type OpenaiMcpModel struct {
	llm       model.ToolCallingChatModel
	mcpClient *client.Client
	username  string
}

// GetModelType implements [AiModel].
func (this *OpenaiMcpModel) GetModelType() string {
	return OPENAI_MCP_MODEL
}

// Response implements [AiModel].
func (this *OpenaiMcpModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages is empty\n")
	}
	latestContent := messages[len(messages)-1].Content
	firstPrompt := utils.BuildFirstMcpPrompt(latestContent)
	firstMessages := make([]*schema.Message, len(messages))
	copy(firstMessages, messages)
	firstMessages[len(firstMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: firstPrompt,
	}
	firstResp, err := this.llm.Generate(ctx, firstMessages)
	if err != nil {
		return nil, fmt.Errorf("openai mcp model response error: %v\n", err)
	}
	log.Printf("Openai mcp model first response: %v\n", firstResp.Content)
	toolCall, err := utils.ParseMcpResponse(firstResp.Content)
	if err != nil {
		return firstResp, nil
	}
	if !toolCall.IsToolCall {
		log.Println("No need to call a tool")
		return firstResp, nil
	}
	mcpClient, err := this.getMcpClient(ctx)
	if err != nil {
		log.Printf("Get mcp client error: %v\n", err)
		return firstResp, nil
	}
	toolResult, err := utils.CallMcpTool(ctx, mcpClient, toolCall)
	if err != nil {
		log.Printf("Mcp tool call error: %v\n", err)
		return firstResp, nil
	}
	secondPrompt := utils.BuildSecondMcpPrompt(latestContent, toolCall, toolResult)
	secondMessages := make([]*schema.Message, len(messages))
	copy(secondMessages, messages)
	secondMessages[len(secondMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: secondPrompt,
	}
	finalResp, err := this.llm.Generate(ctx, secondMessages)
	if err != nil {
		return nil, fmt.Errorf("openai mcp model response error: %v\n", err)
	}
	return finalResp, nil
}

// ResponseStream implements [AiModel].
func (this *OpenaiMcpModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	latestContent := messages[len(messages)-1].Content
	firstPrompt := utils.BuildFirstMcpPrompt(latestContent)
	firstMessages := make([]*schema.Message, len(messages))
	copy(firstMessages, messages)
	firstMessages[len(firstMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: firstPrompt,
	}
	firstResp, err := this.llm.Generate(ctx, firstMessages)
	firstContent := firstResp.Content
	if err != nil {
		return "", fmt.Errorf("openai mcp model response error: %v\n", err)
	}
	log.Printf("Openai mcp model first response: %v\n", firstContent)
	toolCall, err := utils.ParseMcpResponse(firstContent)
	if err != nil {
		return firstContent, nil
	}
	if !toolCall.IsToolCall {
		log.Println("No need to call a tool")
		return firstContent, nil
	}
	mcpClient, err := this.getMcpClient(ctx)
	if err != nil {
		log.Printf("Get mcp client error: %v\n", err)
		return firstContent, nil
	}
	toolResult, err := utils.CallMcpTool(ctx, mcpClient, toolCall)
	if err != nil {
		log.Printf("Mcp tool call error: %v\n", err)
		return firstContent, nil
	}
	secondPrompt := utils.BuildSecondMcpPrompt(latestContent, toolCall, toolResult)
	secondMessages := make([]*schema.Message, len(messages))
	copy(secondMessages, messages)
	secondMessages[len(secondMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: secondPrompt,
	}
	return this.doResponseStream(ctx, secondMessages, cb)
}

func (this *OpenaiMcpModel) doResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	stream, err := this.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("openai mcp model response stream error: %v\n", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fullContent.String(), fmt.Errorf("openai mcp model response stream receive error: %v\n", err)
		}
		if len(msg.Content) > 0 {
			fullContent.WriteString(msg.Content)
			cb(msg.Content)
		}
	}
	return fullContent.String(), nil
}

func (this *OpenaiMcpModel) getMcpClient(ctx context.Context) (*client.Client, error) {
	mcpConfig := config.Get().McpConfig
	httpTrans, err := transport.NewStreamableHTTP(mcpConfig.BaseUrl)
	if err != nil {
		return nil, fmt.Errorf("create mcp transport error: %v\n", err)
	}
	this.mcpClient = client.NewClient(httpTrans)
	initRequest := mcp.InitializeRequest{}
	initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	initRequest.Params.ClientInfo = mcp.Implementation{
		Name:    "ai-agent-go-mcp-client",
		Version: "1.0.0",
	}
	initRequest.Params.Capabilities = mcp.ClientCapabilities{}
	if _, err := this.mcpClient.Initialize(ctx, initRequest); err != nil {
		return nil, fmt.Errorf("mcp client initialize error: %v\n", err)
	}
	return this.mcpClient, nil
}

var _ AiModel = (*OpenaiMcpModel)(nil)

func NewOpenaiMcpModel(ctx context.Context, username string) (*OpenaiMcpModel, error) {
	aiConfig := config.Get().AiConfig
	llm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL: aiConfig.BaseUrl,
		Model:   aiConfig.ModelName,
		APIKey:  aiConfig.ApiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("create openai mcp model error: %v\n", err)
	}
	return &OpenaiMcpModel{
		llm:      llm,
		username: username,
	}, nil
}

type OllamaMcpModel struct {
	llm       model.ToolCallingChatModel
	mcpClient *client.Client
	username  string
	baseUrl   string
}

// GetModelType implements [AiModel].
func (this *OllamaMcpModel) GetModelType() string {
	return OLLAMA_MCP_MODEL
}

// Response implements [AiModel].
func (this *OllamaMcpModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages is empty\n")
	}
	latestContent := messages[len(messages)-1].Content
	firstPrompt := utils.BuildFirstMcpPrompt(latestContent)
	firstMessages := make([]*schema.Message, len(messages))
	copy(firstMessages, messages)
	firstMessages[len(firstMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: firstPrompt,
	}
	firstResp, err := this.llm.Generate(ctx, firstMessages)
	if err != nil {
		return nil, fmt.Errorf("ollama mcp model response error: %v\n", err)
	}
	log.Printf("Ollama mcp model first response: %v\n", firstResp.Content)
	toolCall, err := utils.ParseMcpResponse(firstResp.Content)
	if err != nil {
		return firstResp, nil
	}
	if !toolCall.IsToolCall {
		log.Println("No need to call a tool")
		return firstResp, nil
	}
	mcpClient, err := this.getMcpClient(ctx)
	if err != nil {
		log.Printf("Get mcp client error: %v\n", err)
		return firstResp, nil
	}
	toolResult, err := utils.CallMcpTool(ctx, mcpClient, toolCall)
	if err != nil {
		log.Printf("Mcp tool call error: %v\n", err)
		return firstResp, nil
	}
	secondPrompt := utils.BuildSecondMcpPrompt(latestContent, toolCall, toolResult)
	secondMessages := make([]*schema.Message, len(messages))
	copy(secondMessages, messages)
	secondMessages[len(secondMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: secondPrompt,
	}
	finalResp, err := this.llm.Generate(ctx, secondMessages)
	if err != nil {
		return nil, fmt.Errorf("ollama mcp model response error: %v\n", err)
	}
	return finalResp, nil
}

// ResponseStream implements [AiModel].
func (this *OllamaMcpModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	latestContent := messages[len(messages)-1].Content
	firstPrompt := utils.BuildFirstMcpPrompt(latestContent)
	firstMessages := make([]*schema.Message, len(messages))
	copy(firstMessages, messages)
	firstMessages[len(firstMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: firstPrompt,
	}
	firstResp, err := this.llm.Generate(ctx, firstMessages)
	firstContent := firstResp.Content
	if err != nil {
		return "", fmt.Errorf("ollama mcp model response error: %v\n", err)
	}
	log.Printf("Ollama mcp model first response: %v\n", firstContent)
	toolCall, err := utils.ParseMcpResponse(firstContent)
	if err != nil {
		return firstContent, nil
	}
	if !toolCall.IsToolCall {
		log.Println("No need to call a tool")
		return firstContent, nil
	}
	mcpClient, err := this.getMcpClient(ctx)
	if err != nil {
		log.Printf("Get mcp client error: %v\n", err)
		return firstContent, nil
	}
	toolResult, err := utils.CallMcpTool(ctx, mcpClient, toolCall)
	if err != nil {
		log.Printf("Mcp tool call error: %v\n", err)
		return firstContent, nil
	}
	secondPrompt := utils.BuildSecondMcpPrompt(latestContent, toolCall, toolResult)
	secondMessages := make([]*schema.Message, len(messages))
	copy(secondMessages, messages)
	secondMessages[len(secondMessages)-1] = &schema.Message{
		Role:    schema.User,
		Content: secondPrompt,
	}
	return this.doResponseStream(ctx, secondMessages, cb)
}

func (this *OllamaMcpModel) doResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("messages is empty\n")
	}
	stream, err := this.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("ollama mcp model response stream error: %v\n", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fullContent.String(), fmt.Errorf("ollama mcp model response stream receive error: %v\n", err)
		}
		if len(msg.Content) > 0 {
			fullContent.WriteString(msg.Content)
			cb(msg.Content)
		}
	}
	return fullContent.String(), nil
}

var _ AiModel = (*OllamaMcpModel)(nil)

func NewOllamaMcpModel(ctx context.Context, username string) (*OllamaMcpModel, error) {
	aiConfig := config.Get().AiConfig
	llm, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
		BaseURL: aiConfig.BaseUrl,
		Model:   aiConfig.ModelName,
	})
	if err != nil {
		return nil, fmt.Errorf("create ollama mcp model error: %v\n", err)
	}
	return &OllamaMcpModel{
		llm:      llm,
		username: username,
	}, nil
}

func (this *OllamaMcpModel) GetMcpClient(ctx context.Context) (*client.Client, error) {
	mcpConfig := config.Get().McpConfig
	httpTrans, err := transport.NewStreamableHTTP(mcpConfig.BaseUrl)
	if err != nil {
		return nil, fmt.Errorf("create mcp transport error: %v\n", err)
	}
	this.mcpClient = client.NewClient(httpTrans)
	initRequest := mcp.InitializeRequest{}
	initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	initRequest.Params.ClientInfo = mcp.Implementation{
		Name:    "ai-agent-go-mcp-client",
		Version: "1.0.0",
	}
	initRequest.Params.Capabilities = mcp.ClientCapabilities{}
	if _, err := this.mcpClient.Initialize(ctx, initRequest); err != nil {
		return nil, fmt.Errorf("mcp client initialize error: %v\n", err)
	}
	return this.mcpClient, nil
}

func (this *OllamaMcpModel) getMcpClient(ctx context.Context) (*client.Client, error) {
	mcpConfig := config.Get().McpConfig
	httpTrans, err := transport.NewStreamableHTTP(mcpConfig.BaseUrl)
	if err != nil {
		return nil, fmt.Errorf("create mcp transport error: %v\n", err)
	}
	this.mcpClient = client.NewClient(httpTrans)
	initRequest := mcp.InitializeRequest{}
	initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	initRequest.Params.ClientInfo = mcp.Implementation{
		Name:    "ai-agent-go-mcp-client",
		Version: "1.0.0",
	}
	initRequest.Params.Capabilities = mcp.ClientCapabilities{}
	if _, err := this.mcpClient.Initialize(ctx, initRequest); err != nil {
		return nil, fmt.Errorf("mcp client initialize error: %v\n", err)
	}
	return this.mcpClient, nil
}

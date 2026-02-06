package ai

import (
	"ai-agent-go/src/config"
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/cloudwego/eino-ext/components/model/ollama"
	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

type StreamCallback func(msg string)

type AiModel interface {
	Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error)
	ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error)
	GetModelName() string
}

type OpenaiModel struct {
	llm model.ToolCallingChatModel
}

// GetModelName implements [AiModel].
func (o *OpenaiModel) GetModelName() string {
	return config.Get().AiConfig.ModelName
}

// Response implements [AiModel].
func (o *OpenaiModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	res, err := o.llm.Generate(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("openai response error: %v", err)
	}
	return res, nil
}

// ResponseStream implements [AiModel].
func (o *OpenaiModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	stream, err := o.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("openai response stream error: %v", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("openai response stream receive error: %v", err)
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

// GetModelName implements [AiModel].
func (o *OllamaModel) GetModelName() string {
	return config.Get().AiConfig.ModelName
}

// Response implements [AiModel].
func (o *OllamaModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	res, err := o.llm.Generate(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("ollama response error: %v", err)
	}
	return res, nil
}

// ResponseStream implements [AiModel].
func (o *OllamaModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	stream, err := o.llm.Stream(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("ollama response stream error: %v", err)
	}
	defer stream.Close()
	var fullContent strings.Builder
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("ollama response stream receive error: %v", err)
		}
		if len(msg.Content) > 0 {
			cb(msg.Content)
			fullContent.WriteString(msg.Content)
		}
	}
	return fullContent.String(), nil
}

var _ AiModel = (*OpenaiModel)(nil)

func NewOpenAiModel(ctx context.Context) (*OpenaiModel, error) {
	cfg := config.Get().AiConfig
	llm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL: cfg.BaseUrl,
		Model:   cfg.ModelName,
		APIKey:  cfg.ApiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("create openai model error: %v", err)
	}
	return &OpenaiModel{llm}, nil
}

var _ AiModel = (*OllamaModel)(nil)

func NewOllamaModel(ctx context.Context) (*OllamaModel, error) {
	cfg := config.Get().AiConfig
	llm, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
		BaseURL: cfg.BaseUrl,
		Model:   cfg.ModelName,
	})
	if err != nil {
		return nil, fmt.Errorf("create ollama model error: %v", err)
	}
	return &OllamaModel{llm}, nil
}

type OpenaiRagModel struct {
	llm      model.ToolCallingChatModel
	username string
}

// GetModelName implements [AiModel].
func (r *OpenaiRagModel) GetModelName() string {
	return config.Get().AiConfig.ModelName
}

// Response implements [AiModel].
func (r *OpenaiRagModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	panic("unimplemented")
}

// ResponseStream implements [AiModel].
func (r *OpenaiRagModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	panic("unimplemented")
}

var _ AiModel = (*OpenaiRagModel)(nil)

func NewOpenaiRagModel(ctx context.Context, username string) (*OpenaiRagModel, error) {
	aiCfg := config.Get().AiConfig
	llm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL: aiCfg.BaseUrl,
		Model:   aiCfg.ModelName,
		APIKey:  aiCfg.ApiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("create openai rag model error: %v", err)
	}
	return &OpenaiRagModel{llm, username}, nil
}

type OllamaRagModel struct {
	llm      model.ToolCallingChatModel
	username string
}

// GetModelName implements [AiModel].
func (o *OllamaRagModel) GetModelName() string {
	return config.Get().AiConfig.ModelName
}

// Response implements [AiModel].
func (o *OllamaRagModel) Response(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	panic("unimplemented")
}

// ResponseStream implements [AiModel].
func (o *OllamaRagModel) ResponseStream(ctx context.Context, messages []*schema.Message, cb StreamCallback) (string, error) {
	panic("unimplemented")
}

var _ AiModel = (*OllamaRagModel)(nil)

func NewOllamaRagModel(ctx context.Context, username string) (*OllamaRagModel, error) {
	aiCfg := config.Get().AiConfig
	llm, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
		BaseURL: aiCfg.BaseUrl,
		Model:   aiCfg.ModelName,
	})
	if err != nil {
		return nil, fmt.Errorf("create ollama rag model error: %v", err)
	}
	return &OllamaRagModel{llm, username}, nil
}

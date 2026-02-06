package ai

import (
	"context"
	"fmt"
	"sync"
)

type AiModelCreator func(ctx context.Context, config map[string]any) (AiModel, error)

type AiModelFactory struct {
	creators map[string]AiModelCreator
}

var (
	factory     AiModelFactory
	factoryOnce sync.Once
)

func GetAiModelFactory() *AiModelFactory {
	factoryOnce.Do(func() {
		factory = AiModelFactory{
			creators: make(map[string]AiModelCreator),
		}
		factory.registerCreators()
	})
	return &factory
}

func (this *AiModelFactory) registerCreators() {
	this.creators[OPENAI_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		return NewOpenaiModel(ctx)
	}

	this.creators[OPENAI_RAG_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		username, ok := cfg["username"].(string)
		if !ok {
			return nil, fmt.Errorf("RAG model requires username\n")
		}
		return NewOpenaiRagModel(ctx, username)
	}

	this.creators[OLLAMA_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		return NewOllamaModel(ctx)
	}

	this.creators[OLLAMA_RAG_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		username, ok := cfg["username"].(string)
		if !ok {
			return nil, fmt.Errorf("RAG model requires username\n")
		}
		return NewOllamaRagModel(ctx, username)
	}

	this.creators[OPENAI_MCP_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		username, ok := cfg["username"].(string)
		if !ok {
			return nil, fmt.Errorf("Mcp model requires username\n")
		}
		return NewOpenaiMcpModel(ctx, username)
	}

	this.creators[OLLAMA_MCP_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		username, ok := cfg["username"].(string)
		if !ok {
			return nil, fmt.Errorf("Mcp model requires username\n")
		}
		return NewOllamaMcpModel(ctx, username)
	}
}

func (this *AiModelFactory) CreateAiModel(ctx context.Context, modelType string, config map[string]any) (AiModel, error) {
	creator, ok := this.creators[modelType]
	if !ok {
		return nil, fmt.Errorf("unsupported model type: %s\n", modelType)
	}
	return creator(ctx, config)
}

func (this *AiModelFactory) CreateAiAgent(ctx context.Context, modelType, sessionId string, config map[string]any) (*AiAgent, error) {
	model, err := this.CreateAiModel(ctx, modelType, config)
	if err != nil {
		return nil, err
	}
	return NewAiAgent(model, sessionId), nil
}

func (this *AiModelFactory) RegisterModel(modeType string, creator AiModelCreator) {
	this.creators[modeType] = creator
}

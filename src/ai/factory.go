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
	factory AiModelFactory
	once    sync.Once
)

func GetFactory() *AiModelFactory {
	once.Do(func() {
		factory = AiModelFactory{
			creators: make(map[string]AiModelCreator),
		}
		factory.registerCreators()
	})
	return &factory
}

func (f *AiModelFactory) registerCreators() {
	f.creators[OPENAI_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		return NewOpenAiModel(ctx)
	}

	f.creators[OPENAI_RAG_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		username, ok := cfg["username"].(string)
		if !ok {
			return nil, fmt.Errorf("RAG model requires username\n")
		}
		return NewOpenaiRagModel(ctx, username)
	}

	f.creators[OLLAMA_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		return NewOllamaModel(ctx)
	}

	f.creators[OLLAMA_RAG_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		username, ok := cfg["username"].(string)
		if !ok {
			return nil, fmt.Errorf("RAG model requires username\n")
		}
		return NewOllamaRagModel(ctx, username)
	}

	f.creators[OLLAMA_MCP_MODEL] = func(ctx context.Context, cfg map[string]any) (AiModel, error) {
		username, ok := cfg["username"].(string)
		if !ok {
			return nil, fmt.Errorf("MCP model requires username\n")
		}
		return NewOllamaMcpModel(ctx, username)
	}
}

package ai

import (
	"context"
	"sync"
)

var ctx = context.Background()

type AiAgentManager struct {
	username2sessionId2aiAgent map[string]map[string]*AiAgent
	mu                         sync.RWMutex
}

func NewAiAgentManager() *AiAgentManager {
	return &AiAgentManager{
		username2sessionId2aiAgent: make(map[string]map[string]*AiAgent),
	}
}

func (m *AiAgentManager) GetOrNewAiAgent(username, sessionId, modelName, modelNamePrefix string, config map[string]any) (*AiAgent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	sessionId2aiAgent, ok := m.username2sessionId2aiAgent[username]
	if !ok {
		sessionId2aiAgent = make(map[string]*AiAgent)
		m.username2sessionId2aiAgent[username] = sessionId2aiAgent
	}
	aiAgent, ok := sessionId2aiAgent[sessionId]
	if ok {
		return aiAgent, nil
	}
	factory := GetFactory()
	
}

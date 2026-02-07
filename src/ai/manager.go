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

func (this *AiAgentManager) GetOrCreateAiAgent(username, sessionId, modelType string, config map[string]any) (*AiAgent, error) {
	this.mu.Lock()
	defer this.mu.Unlock()
	sessionId2aiAgent, ok := this.username2sessionId2aiAgent[username]
	if !ok {
		sessionId2aiAgent = make(map[string]*AiAgent)
		this.username2sessionId2aiAgent[username] = sessionId2aiAgent
	}
	aiAgent, ok := sessionId2aiAgent[sessionId]
	if ok {
		return aiAgent, nil
	}
	factory := GetAiModelFactory()
	aiAgent, err := factory.CreateAiAgent(ctx, modelType, sessionId, config)
	if err != nil {
		return nil, err
	}
	sessionId2aiAgent[sessionId] = aiAgent
	return aiAgent, nil
}

func (this *AiAgentManager) GetAiAgent(username, sessionId string) (*AiAgent, bool) {
	this.mu.Lock()
	defer this.mu.Unlock()
	sessionId2aiAgent, ok := this.username2sessionId2aiAgent[username]
	if !ok {
		return nil, false
	}
	aiAgent, ok := sessionId2aiAgent[sessionId]
	return aiAgent, ok
}

func (this *AiAgentManager) RemoveAiAgent(username, sessionId string) {
	this.mu.Lock()
	defer this.mu.Unlock()
	sessionId2aiAgent, ok := this.username2sessionId2aiAgent[username]
	if !ok {
		return
	}
	delete(sessionId2aiAgent, sessionId)
	if len(sessionId2aiAgent) == 0 {
		delete(this.username2sessionId2aiAgent, username)
	}
}

func (this *AiAgentManager) GetUserAllSessionIds(username string) []string {
	this.mu.RLock()
	defer this.mu.RUnlock()
	sessionId2aiAgent, ok := this.username2sessionId2aiAgent[username]
	if !ok {
		return []string{}
	}
	sessionIdList := make([]string, 0, len(sessionId2aiAgent))
	for sessionId := range sessionId2aiAgent {
		sessionIdList = append(sessionIdList, sessionId)
	}
	return sessionIdList
}

var (
	manager     *AiAgentManager
	managerOnce sync.Once
)

func GetAiAgentManager() *AiAgentManager {
	managerOnce.Do(func() {
		manager = NewAiAgentManager()
	})
	return manager
}

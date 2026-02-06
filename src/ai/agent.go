package ai

import (
	"ai-agent-go/src/db"
	"ai-agent-go/src/model"
	"ai-agent-go/src/utils"
	"context"
	"sync"
)

type SaveFunc func(*model.Message) (*model.Message, error)

type AiAgent struct {
	model     AiModel
	messages  []*model.Message
	mu        sync.RWMutex
	SessionId string
	saveFunc  SaveFunc
}

func (a *AiAgent) GetModelType() string {
	return a.model.GetModelType()
}

func (a *AiAgent) Response(ctx context.Context, username, userMessage string) (*model.Message, error) {
	a.AddMessage(userMessage, username, true, true)
	a.mu.RLock()
	// model.Message -> schema.Message
	messages := utils.Convert2schemaMessages(a.messages)
	a.mu.RUnlock()
	schemaMessage, err := a.model.Response(ctx, messages)
	if err != nil {
		return nil, err
	}
	// schema.Message -> model.Message
	aiMessage := &model.Message{
		SessionId: a.SessionId,
		Username:  username,
		Content:   schemaMessage.Content,
		IsUser:    false,
	}
	a.AddMessage(aiMessage.Content, username, true, true)
	return aiMessage, nil
}

func (a *AiAgent) ResponseStream(ctx context.Context, username, userMessage string, cb StreamCallback) (*model.Message, error) {
	a.AddMessage(userMessage, username, true, true)
	a.mu.RLock()
	// model.Message -> schema.Message
	messages := utils.Convert2schemaMessages(a.messages)
	a.mu.RUnlock()
	content, err := a.model.ResponseStream(ctx, messages, cb)
	if err != nil {
		return nil, err
	}

	// string -> model.Message
	aiMessage := &model.Message{
		SessionId: a.SessionId,
		Username:  username,
		Content:   content,
		IsUser:    false,
	}
	return aiMessage, nil
}

func NewAiAgent(model_ AiModel, sessionId string) *AiAgent {
	return &AiAgent{
		model:    model_,
		messages: []*model.Message{},
		saveFunc: func(m *model.Message) (*model.Message, error) {
			data := db.GenerateMessageData(m.SessionId, m.Content, m.Username, m.IsUser)
			err := db.PublishMessage(data)
			return m, err
		},
		SessionId: sessionId,
	}
}

func (a *AiAgent) AddMessage(content string, username string, isUser bool, shouldSave bool) {
	userMessage := model.Message{
		SessionId: a.SessionId,
		Content:   content,
		Username:  username,
		IsUser:    isUser,
	}
	a.messages = append(a.messages, &userMessage)
	if shouldSave {
		a.saveFunc(&userMessage)
	}
}

func (a *AiAgent) SetSaveFunc(saveFunc SaveFunc) {
	a.saveFunc = saveFunc
}

func (a *AiAgent) GetMessages() []*model.Message {
	a.mu.RLock()
	defer a.mu.RUnlock()
	res := make([]*model.Message, len(a.messages))
	copy(res, a.messages)
	return res
}

// var _ AiModel = (*AiAgent)(nil)

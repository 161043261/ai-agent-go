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

func (this *AiAgent) GetModelType() string {
	return this.model.GetModelType()
}

func (this *AiAgent) Response(ctx context.Context, username, userMessage string) (*model.Message, error) {
	this.AddMessage(userMessage, username, true, true)
	this.mu.RLock()
	// model.Message -> schema.Message
	messages := utils.Convert2schemaMessages(this.messages)
	this.mu.RUnlock()
	schemaMessage, err := this.model.Response(ctx, messages)
	if err != nil {
		return nil, err
	}
	// schema.Message -> model.Message
	aiMessage := &model.Message{
		SessionId: this.SessionId,
		Username:  username,
		Content:   schemaMessage.Content,
		IsUser:    false,
	}
	this.AddMessage(aiMessage.Content, username, true, true)
	return aiMessage, nil
}

func (this *AiAgent) ResponseStream(ctx context.Context, username, userMessage string, cb StreamCallback) (*model.Message, error) {
	this.AddMessage(userMessage, username, true, true)
	this.mu.RLock()
	// model.Message -> schema.Message
	messages := utils.Convert2schemaMessages(this.messages)
	this.mu.RUnlock()
	content, err := this.model.ResponseStream(ctx, messages, cb)
	if err != nil {
		return nil, err
	}

	// string -> model.Message
	aiMessage := &model.Message{
		SessionId: this.SessionId,
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

func (this *AiAgent) AddMessage(content string, username string, isUser bool, shouldSave bool) {
	userMessage := model.Message{
		SessionId: this.SessionId,
		Content:   content,
		Username:  username,
		IsUser:    isUser,
	}
	this.messages = append(this.messages, &userMessage)
	if shouldSave {
		this.saveFunc(&userMessage)
	}
}

func (this *AiAgent) SetSaveFunc(saveFunc SaveFunc) {
	this.saveFunc = saveFunc
}

func (this *AiAgent) GetMessages() []*model.Message {
	this.mu.RLock()
	defer this.mu.RUnlock()
	res := make([]*model.Message, len(this.messages))
	copy(res, this.messages)
	return res
}

// var _ AiModel = (*AiAgent)(nil)

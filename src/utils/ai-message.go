package utils

import (
	"ai-agent-go/src/model"
	"github.com/cloudwego/eino/schema"
)

func NewAiMessage(sessionId string, username string, message schema.Message) *model.Message {
	return &model.Message{
		SessionId: sessionId,
		Username:  username,
		Content:   message.Content,
	}
}

func NewSchemaMessages(messages []model.Message) []schema.Message {
	schemaMessages := make([]schema.Message, 0, len(messages))
	for _, m := range messages {
		role := schema.Assistant
		if m.IsUser {
			role = schema.User
		}
		schemaMessages = append(schemaMessages, schema.Message{
			Role:    role,
			Content: m.Content,
		})
	}
	return schemaMessages
}

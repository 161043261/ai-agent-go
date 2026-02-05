package dao

import (
	"ai-agent-go/src/db"
	"ai-agent-go/src/model"
)

func GetMessageBySessionId(sessionId string) ([]model.Message, error) {
	var messages []model.Message
	err := db.Mysql.Where("session_id = ?", sessionId).Order("created_at ASC").Find(&messages).Error
	return messages, err
}

func GetMessagesBySessionIds(sessionIds []string) ([]model.Message, error) {
	var messages []model.Message
	if len(sessionIds) == 0 {
		return messages, nil
	}
	err := db.Mysql.Where("session_id IN ?", sessionIds).Order("created_at ASC").Find(&messages).Error
	return messages, err
}

func CreateMessage(message *model.Message) (*model.Message, error) {
	err := db.Mysql.Create(message).Error
	return message, err
}

func GetAllMessages() ([]model.Message, error) {
	var messages []model.Message
	err := db.Mysql.Order("created_at ASC").Find(&messages).Error
	return messages, err
}

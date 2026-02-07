package dao

import (
	"ai-agent-go/src/db"
	"ai-agent-go/src/model"
)

func CreateSession(session *model.Session) error {
	return db.Mysql.Create(session).Error
}

func GetSessionById(sessionId string) (*model.Session, error) {
	var session model.Session
	err := db.Mysql.Where("id = ?", sessionId).First(&session).Error
	return &session, err
}

func GetSessionByUsername(username string) ([]model.Session, error) {
	var sessions []model.Session
	err := db.Mysql.Where("username = ?", username).Find(&sessions).Error
	return sessions, err
}

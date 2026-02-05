package model

import "time"

type Message struct {
	Id        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	SessionId string    `gorm:"index;not null;type:varchar(64)" json:"session_id"`
	Username  string    `gorm:"type:varchar(64)" json:"username"`
	Content   string    `gorm:"type:text" json:"content"`
	IsUser    bool      `gorm:"not null" json:"is_user"`
	CreatedAt time.Time `json:"created_at"`
}

type History struct {
	IsUser  bool   `json:"is_user"`
	Content string `json:"content"`
}

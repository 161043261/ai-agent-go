package model

import (
	"time"

	"gorm.io/gorm"
)

type Session struct {
	Id        string         `gorm:"primaryKey;type:varchar(64)" json:"id"`
	Username  string         `gorm:"index;not null" json:"username"`
	Title     string         `gorm:"type:varchar(128)" json:"title"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type SessionDto struct {
	Id    string `json:"id"`
	Title string `json:"title"`
}

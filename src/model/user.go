package model

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	Id        int64          `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"type:varchar(64)" json:"name"`
	Email     string         `gorm:"type:varchar(128);index" json:"email"`
	Username  string         `gorm:"type:varchar(64);uniqueIndex" json:"username"`
	Password  string         `gorm:"type:varchar(256)" json:"-"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

package dao

import (
	"ai-agent-go/src/db"
	"ai-agent-go/src/model"
	"ai-agent-go/src/utils"
	"context"

	"gorm.io/gorm"
)

var ctx = context.Background()

func InsertUser(user *model.User) (*model.User, error) {
	err := db.Mysql.Create(&user).Error
	// With id
	return user, err
}

func GetUserByUsername(username string) (*model.User, error) {
	user := new(model.User)
	err := db.Mysql.Where("username = ?", username).First(user).Error
	return user, err
}

func GetUserByEmail(email string) (*model.User, error) {
	user := new(model.User)
	err := db.Mysql.Where("email = ?", email).First(user).Error
	return user, err
}

func IsUserExistByUsername(username string) (*model.User, bool) {
	user, err := GetUserByUsername(username)
	if err == gorm.ErrRecordNotFound || user == nil {
		return nil, false
	}
	return user, true
}

func IsUserExistByEmail(email string) (*model.User, bool) {
	user, err := GetUserByEmail(email)
	if err == gorm.ErrRecordNotFound || user == nil {
		return nil, false
	}
	return user, true
}

func Register(username, email, password string) (*model.User, bool) {
	user, err := InsertUser(&model.User{
		Email:    email,
		Name:     username,
		Username: username,
		Password: utils.Md5(password),
	})
	if err != nil {
		return nil, false
	}
	return user, true
}

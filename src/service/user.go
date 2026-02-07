package service

import (
	"ai-agent-go/src/code"
	"ai-agent-go/src/dao"
	"ai-agent-go/src/utils"
)

func Login(username, password string) (string, code.Code) {
	user, ok := dao.IsUserExistByUsername(username)
	if !ok {
		return "", code.UserNotExist
	}
	if user.Password != utils.Md5(password) {
		return "", code.PasswordError
	}
	token, err := utils.JwtToken(user.Id, user.Username)
	if err != nil {
		return "", code.ServerError
	}
	return token, code.OK
}

func Register(email, password string) (username, token string, c code.Code) {
	if _, ok := dao.IsUserExistByEmail(email); ok {
		return "", "", code.UserExist
	}
	username, _ = utils.GetRandStrBase64(12)
	user, ok := dao.Register(username, email, password)
	if !ok || user.Username != username {
		return "", "", code.ServerError
	}
	token, err := utils.JwtToken(user.Id, user.Username)
	if err != nil {
		return "", "", code.ServerError
	}
	return token, username, code.OK
}

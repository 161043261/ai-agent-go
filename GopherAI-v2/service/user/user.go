package user

import (
	"GopherAI/common/code"
	"GopherAI/dao/user"
	"GopherAI/model"
	"GopherAI/utils"
	"GopherAI/utils/myjwt"
	"context"
)

var ctx = context.Background()

func Login(username, password string) (string, code.Code) {
	var userInformation *model.User
	var ok bool
	//1:判断用户是否存在
	if ok, userInformation = user.IsExistUser(username); !ok {

		return "", code.CodeUserNotExist
	}
	//2:判断用户是否密码账号正确
	if userInformation.Password != utils.MD5(password) {
		return "", code.CodeInvalidPassword
	}
	//3:返回一个Token
	token, err := myjwt.GenerateToken(userInformation.ID, userInformation.Username)

	if err != nil {
		return "", code.CodeServerBusy
	}
	return token, code.CodeSuccess
}

func Register(email, password string) (string, string, code.Code) {

	var ok bool
	var userInformation *model.User

	//1:先判断用户是否已经存在了（通过邮箱检查）
	if ok, _ := user.IsExistUserByEmail(email); ok {
		return "", "", code.CodeUserExist
	}

	//2：生成11位的账号
	username := utils.GetRandomNumbers(11)

	//3：注册到数据库中
	if userInformation, ok = user.Register(username, email, password); !ok {
		return "", "", code.CodeServerBusy
	}

	// 4:生成Token
	token, err := myjwt.GenerateToken(userInformation.ID, userInformation.Username)

	if err != nil {
		return "", "", code.CodeServerBusy
	}

	// 返回 token 和 username，用户名直接在响应中返回给前端
	return token, username, code.CodeSuccess
}

package controller

import (
	"ai-agent-go/src/code"
	"ai-agent-go/src/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

type (
	LoginRequest struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	LoginResponse struct {
		Response
		Token    string `json:"token,omitempty"`
		Username string `json:"username,omitempty"`
	}

	RegisterRequest struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	RegisterResponse struct {
		Response
		Token    string `json:"token,omitempty"`
		Username string `json:"username,omitempty"`
	}
)

func Login(c *gin.Context) {
	req := new(LoginRequest)
	res := new(LoginResponse)
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(http.StatusOK, res.CodeOf(code.ParamsInvalid))
		return
	}

	token, code_ := service.Login(req.Username, req.Password)
	if code_ != code.OK {
		c.JSON(http.StatusOK, res.CodeOf(code_))
		return
	}

	res.Success()
	res.Token = token
	c.JSON(http.StatusOK, res)
}

func Register(c *gin.Context) {
	req := new(RegisterRequest)
	res := new(RegisterResponse)
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(http.StatusOK, res.CodeOf(code.ParamsInvalid))
		return
	}
	token, username, code_ := service.Register(req.Email, req.Password)
	if code_ != code.OK {
		c.JSON(http.StatusOK, res.CodeOf(code_))
		return
	}
	res.Success()
	res.Token = token
	res.Username = username
	c.JSON(http.StatusOK, res)
}

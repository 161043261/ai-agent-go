package controller

import (
	"ai-agent-go/src/code"
	"ai-agent-go/src/model"
	"ai-agent-go/src/service"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type (
	GetUserSessionsResponse struct {
		Response
		Sessions []model.SessionDto `json:"sessions,omitempty"`
	}

	CreateSessionAndSendMessageRequest struct {
		UserQuestion string `json:"question" binding:"required"`
		ModelType    string `json:"model_type" binding:"required"`
	}

	CreateSessionAndSendMessageResponse struct {
		Response
		AiAnswer  string `json:"answer,omitempty"`
		SessionId string `json:"session_id,omitempty"`
	}

	SendMessage2sessionRequest struct {
		UserQuestion string `json:"question" binding:"required"`
		ModelType    string `json:"model_type" binding:"required"`
		SessionId    string `json:"session_id" binding:"required"`
	}

	SendMessage2sessionResponse struct {
		Response
		AiAnswer string `json:"answer,omitempty"`
	}

	GetChatHistoryListRequest struct {
		SessionId string `json:"session_id,omitempty" binding:"required"`
	}

	GetChatHistoryListResponse struct {
		Response
		HistoryList []model.History `json:"history"`
	}
)

func GetUserSessionsByUsername(c *gin.Context) {
	res := new(GetUserSessionsResponse)
	username := c.GetString("username")
	sessions := service.GetSessionsByUsername(username)
	res.Success()
	res.Sessions = sessions
	c.JSON(http.StatusOK, res)
}

func CreateSessionAndSendMessage(c *gin.Context) {
	req := new(CreateSessionAndSendMessageRequest)
	res := new(CreateSessionAndSendMessageResponse)
	username := c.GetString("username")
	if err := c.ShouldBindJSON(req); err != nil {
		// gin.H{"code": 2001, "message": "Params Invalid"}
		c.JSON(http.StatusOK, res.CodeOf(code.ParamsInvalid))
		return
	}
	sessionId, aiMessage, code_ := service.CreateSessionAndSendMessage(username, req.UserQuestion, req.ModelType)
	if code_ != code.OK {
		c.JSON(http.StatusOK, res.CodeOf(code_))
		return
	}
	res.Success()
	res.SessionId = sessionId
	res.AiAnswer = aiMessage
	c.JSON(http.StatusOK, res)
}

func CreateStreamSessionAndSendMessageStream(c *gin.Context) {
	req := new(CreateSessionAndSendMessageRequest)
	username := c.GetString("username")
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(
			http.StatusOK,
			gin.H{
				"code":    2001,
				"message": "Params Invalid",
			})
		return
	}
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("X-Accel-Buffering", "no")
	sessionId, code_ := service.CreateStreamSession(username, req.UserQuestion)
	if code_ != code.OK {
		log.Println("Create stream session error")
		c.SSEvent("error", gin.H{
			"code":    code_,
			"message": code_.Message(),
		})
	}
	c.Writer.WriteString(
		fmt.Sprintf("data: {\"session_id\": \"%s\"}\n\n", sessionId),
	)
	code_ = service.SendMessageStream2session(username, req.UserQuestion, req.ModelType, sessionId, http.ResponseWriter(c.Writer))
	if code_ != code.OK {
		log.Println("Send message stream to session error")
		c.SSEvent("error", gin.H{
			"code":    code_,
			"message": code_.Message(),
		})
		return
	}
}

func SendMessage2session(c *gin.Context) {
	req := new(SendMessage2sessionRequest)
	res := new(SendMessage2sessionResponse)
	username := c.GetString("username")
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(http.StatusOK, res.CodeOf(code.ParamsInvalid))
		return
	}
	aiMessage, code_ := service.SendMessage2session(username, req.UserQuestion, req.ModelType, req.SessionId)
	if code_ != code.OK {
		c.JSON(http.StatusOK, res.CodeOf(code_))
		return
	}
	res.Success()
	res.AiAnswer = aiMessage
	c.JSON(http.StatusOK, res)
}

func SendMessageStream2session(c *gin.Context) {
	req := new(SendMessage2sessionRequest)
	username := c.GetString("username")
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(
			http.StatusOK,
			gin.H{
				"code":    2001,
				"message": "Params Invalid",
			})
		return
	}
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("X-Accel-Buffering", "no")
	code_ := service.SendMessageStream2session(username, req.UserQuestion, req.ModelType, req.SessionId, http.ResponseWriter(c.Writer))
	if code_ != code.OK {
		log.Println("Send message stream to session error")
		c.SSEvent("error", gin.H{
			"code":    code_,
			"message": code_.Message(),
		})
		return
	}
}

func GetChatHistoryList(c *gin.Context) {
	req := new(GetChatHistoryListRequest)
	res := new(GetChatHistoryListResponse)
	username := c.GetString("username")
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(http.StatusOK, res.CodeOf(code.ParamsInvalid))
		return
	}
	historyList, code_ := service.GetChatHistoryList(username, req.SessionId)
	if code_ != code.OK {
		c.JSON(http.StatusOK, res.CodeOf(code_))
		return
	}
	res.Success()
	res.HistoryList = historyList
	c.JSON(http.StatusOK, res)
}

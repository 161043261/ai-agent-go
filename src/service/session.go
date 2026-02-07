package service

import (
	"ai-agent-go/src/ai"
	"ai-agent-go/src/code"
	"ai-agent-go/src/config"
	"ai-agent-go/src/dao"
	"ai-agent-go/src/model"
	"ai-agent-go/src/utils"
	"context"
	"fmt"
	"log"
	"net/http"
)

var ctx context.Context

func GetSessionsByUsername(username string) []model.SessionDto {
	manager := ai.GetAiAgentManager()
	sessionIds := manager.GetUserAllSessionIds(username)
	var sessionDtoList []model.SessionDto
	for _, sessionId := range sessionIds {
		sessionDtoList = append(sessionDtoList, model.SessionDto{
			Id:    sessionId,
			Title: sessionId,
		})
	}
	return sessionDtoList
}

func CreateSessionAndSendMessage(username, userMessage, modelType string) (createdSessionId, aiMessage string, _ code.Code) {
	newSession := &model.Session{
		Id:       utils.Uuid(),
		Username: username,
		Title:    userMessage,
	}
	if err := dao.CreateSession(newSession); err != nil {
		log.Println("Create session error:", err)
		return "", "", code.ServerError
	}
	createdSessionId = newSession.Id
	manager := ai.GetAiAgentManager()
	cfg := map[string]any{
		"api_key":  config.Get().AiConfig.ApiKey,
		"username": username,
	}
	aiAgent, err := manager.GetOrCreateAiAgent(username, createdSessionId, modelType, cfg)
	if err != nil {
		log.Println("Get or create ai agent error:", err)
		return "", "", code.ModelError
	}
	aiResponse, err := aiAgent.Response(ctx, username, userMessage)
	if err != nil {
		log.Println("Ai agent response error:", err)
		return "", "", code.ModelError
	}
	aiMessage = aiResponse.Content
	return createdSessionId, aiMessage, code.OK
}

func CreateStreamSession(username, userMessage string) (string, code.Code) {
	newSession := &model.Session{
		Id:       utils.Uuid(),
		Username: username,
		Title:    userMessage,
	}
	if err := dao.CreateSession(newSession); err != nil {
		log.Println("Create session error:", err)
		return "", code.ServerError
	}
	return newSession.Id, code.OK
}

func SendMessageStream2session(username, userMessage, modelType, sessionId string, writer http.ResponseWriter) code.Code {
	flusher, ok := writer.(http.Flusher)
	if !ok {
		log.Println("Stream message unsupported")
		return code.ServerError
	}
	manager := ai.GetAiAgentManager()
	cfg := map[string]any{
		"api_key":  config.Get().AiConfig.ApiKey,
		"username": username,
	}
	aiAgent, err := manager.GetOrCreateAiAgent(username, sessionId, modelType, cfg)
	if err != nil {
		log.Println("Get or create ai agent error:", err)
		return code.ModelError
	}
	cb := func(chunk string) {
		log.Printf("SSE send chunk: %s (len=%d)\n", chunk, len(chunk))
		// _, err := writer.Write([]byte(fmt.Sprintf("data: %s\n\n", chunk)))
		_, err := fmt.Fprintf(writer, "data: %s\n\n", chunk)
		if err != nil {
			log.Println("SSE write error:", err)
			return
		}
		flusher.Flush()
		log.Println("SSE flushed")
	}
	if _, err := aiAgent.ResponseStream(ctx, username, userMessage, cb); err != nil {
		log.Println("Stream message error:", err)
		return code.ModelError
	}
	if _, err := writer.Write([]byte("data: [DONE]\n\n")); err != nil {
		log.Println("write [DONE] error:", err)
		return code.ModelError
	}
	flusher.Flush()
	return code.OK
}

func CreateStreamSessionAndSendMessageStream(username, userMessage, modelType string, writer http.ResponseWriter) (string, code.Code) {
	sessionId, c := CreateStreamSession(username, userMessage)
	if c != code.OK {
		return "", c
	}
	c = SendMessageStream2session(username, userMessage, modelType, sessionId, writer)
	if c != code.OK {
		return "", c
	}
	return sessionId, c
}

func SendMessage2session(username, userMessage, modelType, sessionId string) (string, code.Code) {
	manager := ai.GetAiAgentManager()
	cfg := map[string]any{
		"username": username,
	}
	aiAgent, err := manager.GetOrCreateAiAgent(username, sessionId, modelType, cfg)
	if err != nil {
		log.Println("Get or create ai agent error:", err)
		return "", code.ModelError
	}
	aiResponse, err := aiAgent.Response(ctx, username, userMessage)
	if err != nil {
		log.Println("Ai agent response error:", err)
		return "", code.ModelError
	}
	return aiResponse.Content, code.OK
}

func GetChatHistoryList(username, sessionId string) ([]model.History, code.Code) {
	manager := ai.GetAiAgentManager()
	aiAgent, ok := manager.GetAiAgent(username, sessionId)
	if !ok {
		return nil, code.ServerError
	}
	messages := aiAgent.GetMessages()
	historyList := make([]model.History, 0, len(messages))
	for _, message := range messages {
		historyList = append(historyList, model.History{
			IsUser:  message.IsUser,
			Content: message.Content,
		})
	}
	return historyList, code.ModelError
}

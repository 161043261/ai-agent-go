package main

import (
	"ai-agent-go/src/ai"
	"ai-agent-go/src/config"
	"ai-agent-go/src/dao"
	"ai-agent-go/src/db"
	"ai-agent-go/src/router"
	"fmt"
	"log"
)

func startServer(addr string, port int) error {
	r := router.Init()
	return r.Run(fmt.Sprintf("%s:%d", addr, port))
}

func loadDataFromDb() {
	manager := ai.GetAiAgentManager()
	messages, err := dao.GetAllMessages()
	if err != nil {
		log.Println("Get all messages error:", err)
		return
	}
	for i := range messages {
		msg := &messages[i]
		modelType := ai.OLLAMA_MODEL
		cfg := make(map[string]any)
		aiAgent, err := manager.GetOrCreateAiAgent(msg.Username, msg.SessionId, modelType, cfg)
		if err != nil {
			log.Printf("Create ai agent for user=%s, session=%s: %v\n", msg.Username, msg.SessionId, err)
			continue
		}
		aiAgent.AddMessage(msg.Content, msg.Username, msg.IsUser, false)
	}
	log.Println("AI agent manager initialized")
}

func main() {
	appConfig := config.Get().AppConfig
	var (
		host = appConfig.Host
		port = appConfig.Port
	)
	if err := db.InitMysql(); err != nil {
		log.Println("Mysql initialize error:", err)
		return
	}
	loadDataFromDb()
	if err := db.InitCache(); err != nil {
		log.Println("Cache initialize error:", err)
		return
	}
	if err := db.InitMessageQueue(); err != nil {
		log.Println("Message queue initialize error:", err)
		return
	}
	db.StartRedisMessageConsumer()
	if err := startServer(host, port); err != nil {
		panic(err)
	}
}

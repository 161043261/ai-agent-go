package config

import (
	"encoding/json"
	"log"
	"os"
)

const (
	PROVIDER_OLLAMA = "ollama"
	PROVIDER_OPENAI = "openai"
)

type AppConfig struct {
	Port int    `json:"port"`
	Name string `json:"name"`
	Host string `json:"host"`
}

type RedisConfig struct {
	Enabled  bool   `json:"enabled"`
	Port     int    `json:"port"`
	Db       int    `json:"db"`
	Host     string `json:"host"`
	Password string `json:"password"`

	Index       string `json:"index"`
	IndexPrefix string `json:"index_prefix"`
}

type MysqlConfig struct {
	Port     int    `json:"port"`
	Host     string `json:"host"`
	User     string `json:"user"`
	Password string `json:"password"`
	Db       string `json:"db"`
	Charset  string `json:"charset"`
}

type JwtConfig struct {
	ExpireDuration int    `json:"expire_duration"`
	Issuer         string `json:"issuer"`
	Subject        string `json:"subject"`
	Key            string `json:"key"`
}

type RagConfig struct {
	EmbeddingModel string `json:"embedding_model"`
	DocsDir        string `json:"docs_dir"`
	Dimension      int    `json:"dimension"`
}

type AiConfig struct {
	Provider  string `json:"provider"`
	ApiKey    string `json:"api_key"`
	ModelName string `json:"model_name"`
	BaseUrl   string `json:"base_url"`
}

type McpConfig struct {
	BaseUrl string `json:"base_url"`
}

type Config struct {
	RedisConfig `json:"redis"`
	MysqlConfig `json:"mysql"`
	JwtConfig   `json:"jwt"`
	AppConfig   `json:"app"`
	RagConfig   `json:"rag"`
	AiConfig    `json:"ai"`
	McpConfig   `json:"mcp"`
}

var config = &Config{
	AppConfig: AppConfig{
		Name: "ai-agent-go",
		Host: "0.0.0.0",
		Port: 8080,
	},
	RedisConfig: RedisConfig{
		Enabled:     false,
		Host:        "127.0.0.1",
		Port:        6379,
		Password:    "",
		Db:          0,
		Index:       "rag_docs:%s:index",
		IndexPrefix: "rag_docs:%s:",
	},
	MysqlConfig: MysqlConfig{
		Port:     3306,
		Host:     "localhost",
		User:     "root",
		Password: "",
		Db:       "ai_agent_go",
		Charset:  "utf8mb4",
	},
	JwtConfig: JwtConfig{
		ExpireDuration: 8760,
		Issuer:         "ai-agent-go",
		Subject:        "ai-agent-go",
		Key:            "ai-agent-go",
	},
	RagConfig: RagConfig{
		// ollama: nomic-embed-text
		// openai: text-embedding-v4
		EmbeddingModel: "nomic-embed-text",
		DocsDir:        "./docs",
		Dimension:      1024,
	},
	McpConfig: McpConfig{
		BaseUrl: "http://localhost:8081/mcp",
	},
	AiConfig: AiConfig{
		Provider: "ollama",
		ApiKey:   "",
		// ollama: qwen2.5:7b, qwen2.5-coder:7
		// openai: qwen-turbo
		ModelName: "qwen2.5:7b",
		BaseUrl:   "http://localhost:11434",
	},
}

func init() {
	data, err := os.ReadFile("config/config.json")
	if err != nil {
		log.Fatal("Read config.json error:", err.Error())
	}
	if err := json.Unmarshal(data, config); err != nil {
		log.Fatal("Read config.json error:", err.Error())
	}
}

func Get() *Config {
	return config
}

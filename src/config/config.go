package config

import (
	"encoding/json"
	"log"
	"os"
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
	Host     int    `json:"host"`
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
	ChatModel      string `json:"chat_model"`
	DocsDir        string `json:"docs_dir"`
	BaseUrl        string `json:"base_url"`
	Dimension      int    `json:"dimension"`
}

type Config struct {
	RedisConfig `json:"redis"`
	MysqlConfig `json:"mysql"`
	JwtConfig   `json:"jwt"`
	AppConfig   `json:"app"`
	RagConfig   `json:"rag"`
}

var config = &Config{
	RedisConfig: RedisConfig{
		Index:       "rag_docs:%s:index",
		IndexPrefix: "rag_docs:%s:",
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

func GetConfig() *Config {
	return config
}

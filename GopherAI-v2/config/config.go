package config

import (
	"encoding/json"
	"log"
	"os"
)

type MainConfig struct {
	Port    int    `json:"port"`
	AppName string `json:"appName"`
	Host    string `json:"host"`
}

type RedisConfig struct {
	RedisEnabled        bool   `json:"enabled"`         // 是否启用 Redis
	RedisPort           int    `json:"port"`
	RedisDb             int    `json:"db"`
	RedisHost           string `json:"host"`
	RedisPassword       string `json:"password"`
	IndexName           string `json:"indexName"`       // Redis 索引名称模板
	IndexNamePrefix     string `json:"indexNamePrefix"` // Redis 索引名称前缀模板
}

type MysqlConfig struct {
	MysqlPort         int    `json:"port"`
	MysqlHost         string `json:"host"`
	MysqlUser         string `json:"user"`
	MysqlPassword     string `json:"password"`
	MysqlDatabaseName string `json:"databaseName"`
	MysqlCharset      string `json:"charset"`
}

type JwtConfig struct {
	ExpireDuration int    `json:"expire_duration"`
	Issuer         string `json:"issuer"`
	Subject        string `json:"subject"`
	Key            string `json:"key"`
}

type RagModelConfig struct {
	RagEmbeddingModel string `json:"embeddingModel"`
	RagChatModelName  string `json:"chatModelName"`
	RagDocDir         string `json:"docDir"`
	RagBaseUrl        string `json:"baseUrl"`
	RagDimension      int    `json:"dimension"`
}

type Config struct {
	RedisConfig    RedisConfig    `json:"redisConfig"`
	MysqlConfig    MysqlConfig    `json:"mysqlConfig"`
	JwtConfig      JwtConfig      `json:"jwtConfig"`
	MainConfig     MainConfig     `json:"mainConfig"`
	RagModelConfig RagModelConfig `json:"ragModelConfig"`
}

// config 全局配置实例，在 init() 中初始化
var config = &Config{
	RedisConfig: RedisConfig{
		IndexName:       "rag_docs:%s:idx",
		IndexNamePrefix: "rag_docs:%s:",
	},
}

func init() {
	data, err := os.ReadFile("config/config.json")
	if err != nil {
		log.Fatal("读取配置文件失败: ", err.Error())
	}
	if err := json.Unmarshal(data, config); err != nil {
		log.Fatal("解析配置文件失败: ", err.Error())
	}
}

// GetConfig 获取全局配置
func GetConfig() *Config {
	return config
}

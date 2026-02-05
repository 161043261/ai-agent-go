package redis

import (
	"GopherAI/config"
	"fmt"
)

func GenerateIndexName(filename string) string {
	return fmt.Sprintf(config.GetConfig().RedisConfig.IndexName, filename)
}

func GenerateIndexNamePrefix(filename string) string {
	return fmt.Sprintf(config.GetConfig().RedisConfig.IndexNamePrefix, filename)
}

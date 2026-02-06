package utils

import (
	"fmt"
	"ai-agent-go/src/config"
)

func GetIndexName(name string) string {
	return fmt.Sprintf(config.Get().RedisConfig.Index, name)
}

func GetIndexNamePrefix(name string) string {
	return fmt.Sprintf(config.Get().RedisConfig.IndexPrefix, name)
}

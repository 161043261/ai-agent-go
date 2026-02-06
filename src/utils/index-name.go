package utils

import (
	"ai-agent-go/src/config"
	"fmt"
)

func GetIndexName(name string) string {
	return fmt.Sprintf(config.Get().RedisConfig.Index, name)
}

func GetIndexNamePrefix(name string) string {
	return fmt.Sprintf(config.Get().RedisConfig.IndexPrefix, name)
}

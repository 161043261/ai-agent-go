package db

import (
	"ai-agent-go/src/config"
	"ai-agent-go/src/model"
	"ai-agent-go/src/utils"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	redis "github.com/redis/go-redis/v9"
)

const (
	MessageStreamKey    = "ai-agent-go:message:stream"
	MessageGroupName    = "message_consumer_group"
	MessageConsumerName = "message_consumer_1"
)

var (
	rdb *redis.Client
	ctx = context.Background()
)

func initRedis() {
	redisConfig := config.Get().RedisConfig
	addr := fmt.Sprintf("%v:%v", redisConfig.Host, redisConfig.Port)
	rdb = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: redisConfig.Password,
		DB:       redisConfig.Db,
		Protocol: 2,
	})
}

func testRedisConnection() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := rdb.Ping(ctx).Result()
	return err
}

func initRedisMessageStream() error {
	ctx := context.Background()
	err := rdb.XGroupCreateMkStream(ctx, MessageStreamKey, MessageGroupName, "0").Err()
	log.Println("Init redis message stream error:", err.Error())
	return err
}

func publishMessage2redis(data []byte) error {
	ctx := context.Background()
	_, err := rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: MessageStreamKey,
		Values: map[string]any{
			"data": string(data),
		},
	}).Result()

	return err
}

func StartRedisMessageConsumer() {
	if !IsRedisEnabled() {
		return
	}
	go consumeMessagesFromRedis()
}

func consumeMessagesFromRedis() {
	ctx := context.Background()
	for {
		chunks, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    MessageGroupName,
			Consumer: MessageConsumerName,
			Streams:  []string{MessageStreamKey, ">"},
			Count:    10,
			Block:    5 * time.Second,
		}).Result()

		if err != nil {
			if err != redis.Nil {
				continue
			}
			log.Printf("Read redis message queue error: %v\n", err)
			time.Sleep(time.Second)
			continue
		}

		for _, chunk := range chunks {
			for _, message := range chunk.Messages {
				if err := processRedisMessage(ctx, message.ID, message.Values); err != nil {
					log.Printf("Process message %s error: %v\n", message.ID, err)
					continue
				}
				rdb.XAck(ctx, MessageStreamKey, MessageGroupName, message.ID)
			}
		}
	}
}

func processRedisMessage(ctx context.Context, messageId string, values map[string]any) error {
	data, ok := values["data"].(string)
	if !ok {
		log.Printf("Message %s type error\n", messageId)
		return nil
	}
	var item MessageQueueItem
	if err := json.Unmarshal([]byte(data), &item); err != nil {
		log.Printf("Message %s json unmarshal error: %s\n", data, err)
	}
	newMessage := &model.Message{
		SessionId: item.SessionId,
		Content:   item.Content,
		Username:  item.Username,
		IsUser:    item.IsUser,
	}
	if err := Mysql.Create(newMessage).Error; err != nil {
		return err
	}
	log.Printf("Processed message %s ok, sessionId=%s, username=%s\n", messageId, item.SessionId, item.Username)
	return nil
}

func setRedisCache(key string, value []byte, expiration time.Duration) error {
	return rdb.Set(ctx, key, value, expiration).Err()
}

func getRedisCache(key string) ([]byte, error) {
	return rdb.Get(ctx, key).Bytes()
}

func deleteRedisCache(key string) error {
	return rdb.Del(ctx, key).Err()
}

func ClearRedisCache(maxLen int64) error {
	if IsRedisEnabled() {
		return nil
	}
	ctx := context.Background()
	return rdb.XTrimMaxLen(ctx, MessageStreamKey, maxLen).Err()
}

func InitRedisIndex(ctx context.Context, filename string) error {
	if !IsRedisEnabled() {
		return fmt.Errorf("redis disabled, cannot initialize redis index\n")
	}
	ragConfig := config.Get().RagConfig
	indexName := utils.GetIndexName(filename)
	_, err := rdb.Do(ctx, "FT.INFO", indexName).Result()
	if err == nil {
		log.Println("Redis index already exists")
	}
	prefix := utils.GetIndexNamePrefix(filename)
	args := []any{
		"FT.CREATE", indexName,
		"ON", "HASH",
		"PREFIX", "1", prefix,
		"SCHEMA",
		"content", "TEXT",
		"metadata", "TEXT",
		"vector", "VECTOR", "FLAT",
		"6",
		"TYPE", "FLOAT32",
		"DIM", ragConfig.Dimension,
		"DISTANCE_METRIC", "COSINE",
	}
	if err := rdb.Do(ctx, args...); err != nil {
		return fmt.Errorf("create redis index error: %v\n", err)
	}
	log.Println("Redis index created")
	return nil
}

func DeleteRedisIndex(ctx context.Context, filename string) error {
	if !IsRedisEnabled() {
		return fmt.Errorf("redis disabled, cannot initialize redis index\n")
	}
	indexName := utils.GetIndexName(filename)
	if err := rdb.Do(ctx, "FT.DROPINDEX", indexName).Err(); err != nil {
		return fmt.Errorf("delete redis index error: %v\n", err)
	}
	log.Println("Redis index deleted")
	return nil
}

func GetRdb() *redis.Client {
	return rdb
}

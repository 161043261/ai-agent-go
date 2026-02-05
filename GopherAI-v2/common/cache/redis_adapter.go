package cache

import (
	"GopherAI/config"
	"GopherAI/dao/message"
	"GopherAI/model"
	"context"
	"encoding/json"
	"log"
	"strconv"
	"time"

	redisCli "github.com/redis/go-redis/v9"
)

// Redis 相关常量
const (
	MessageStreamKey    = "gopherai:message:stream"
	MessageGroupName    = "message_consumer_group"
	MessageConsumerName = "message_consumer_1"
)

var (
	rdb *redisCli.Client
	ctx = context.Background()
)

// GetRedisClient 获取 Redis 客户端（供 RAG 等模块使用）
func GetRedisClient() *redisCli.Client {
	return rdb
}

// initRedis 初始化 Redis 连接
func initRedis() error {
	conf := config.GetConfig().RedisConfig
	host := conf.RedisHost
	port := conf.RedisPort
	password := conf.RedisPassword
	db := conf.RedisDb
	addr := host + ":" + strconv.Itoa(port)

	rdb = redisCli.NewClient(&redisCli.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
		Protocol: 2,
	})

	return nil
}

// testRedisConnection 测试 Redis 连接
func testRedisConnection() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := rdb.Ping(ctx).Result()
	return err
}

// initRedisMessageStream 初始化 Redis Stream 消息队列
func initRedisMessageStream() error {
	ctx := context.Background()

	err := rdb.XGroupCreateMkStream(ctx, MessageStreamKey, MessageGroupName, "0").Err()
	if err != nil {
		if err.Error() != "BUSYGROUP Consumer Group name already exists" {
			return err
		}
		log.Println("消费者组已存在，跳过创建")
	} else {
		log.Println("Redis Stream 消息队列创建成功")
	}

	return nil
}

// publishMessageToRedis 发布消息到 Redis Stream
func publishMessageToRedis(data []byte) error {
	ctx := context.Background()

	_, err := rdb.XAdd(ctx, &redisCli.XAddArgs{
		Stream: MessageStreamKey,
		Values: map[string]interface{}{
			"data": string(data),
		},
	}).Result()

	return err
}

// startRedisMessageConsumer 启动 Redis 消息消费者
func startRedisMessageConsumer() {
	go consumeMessagesFromRedis()
}

// consumeMessagesFromRedis 从 Redis Stream 消费消息
func consumeMessagesFromRedis() {
	ctx := context.Background()

	for {
		streams, err := rdb.XReadGroup(ctx, &redisCli.XReadGroupArgs{
			Group:    MessageGroupName,
			Consumer: MessageConsumerName,
			Streams:  []string{MessageStreamKey, ">"},
			Count:    10,
			Block:    5 * time.Second,
		}).Result()

		if err != nil {
			if err == redisCli.Nil {
				continue
			}
			log.Printf("读取 Redis 消息队列失败: %v", err)
			time.Sleep(time.Second)
			continue
		}

		for _, stream := range streams {
			for _, msg := range stream.Messages {
				if err := processRedisMessage(ctx, msg.ID, msg.Values); err != nil {
					log.Printf("处理消息失败 [ID=%s]: %v", msg.ID, err)
					continue
				}

				rdb.XAck(ctx, MessageStreamKey, MessageGroupName, msg.ID)
			}
		}
	}
}

// processRedisMessage 处理 Redis 消息
func processRedisMessage(ctx context.Context, msgID string, values map[string]interface{}) error {
	data, ok := values["data"].(string)
	if !ok {
		log.Printf("消息格式错误 [ID=%s]", msgID)
		return nil
	}

	var param MessageQueueParam
	if err := json.Unmarshal([]byte(data), &param); err != nil {
		log.Printf("解析消息失败 [ID=%s]: %v", msgID, err)
		return nil
	}

	newMsg := &model.Message{
		SessionID: param.SessionID,
		Content:   param.Content,
		UserName:  param.UserName,
		IsUser:    param.IsUser,
	}

	if _, err := message.CreateMessage(newMsg); err != nil {
		return err
	}

	log.Printf("消息已持久化 [SessionID=%s, User=%s]", param.SessionID, param.UserName)
	return nil
}

// setRedisCache 设置 Redis 缓存
func setRedisCache(key string, value []byte, expiration time.Duration) error {
	return rdb.Set(ctx, key, value, expiration).Err()
}

// getRedisCache 获取 Redis 缓存
func getRedisCache(key string) ([]byte, error) {
	return rdb.Get(ctx, key).Bytes()
}

// deleteRedisCache 删除 Redis 缓存
func deleteRedisCache(key string) error {
	return rdb.Del(ctx, key).Err()
}

// CleanupOldMessages 清理旧消息（Redis 模式专用）
func CleanupOldMessages(maxLen int64) error {
	if !IsRedisEnabled() {
		return nil
	}
	ctx := context.Background()
	return rdb.XTrimMaxLen(ctx, MessageStreamKey, maxLen).Err()
}

package cache

import (
	"GopherAI/config"
	"GopherAI/dao/message"
	"GopherAI/model"
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/allegro/bigcache/v3"
)

// CacheType 缓存类型
type CacheType string

const (
	CacheTypeRedis    CacheType = "redis"
	CacheTypeBigCache CacheType = "bigcache"
)

// MessageQueueParam 消息队列参数结构
type MessageQueueParam struct {
	SessionID string `json:"session_id"`
	Content   string `json:"content"`
	UserName  string `json:"user_name"`
	IsUser    bool   `json:"is_user"`
}

// CacheManager 缓存管理器
type CacheManager struct {
	cacheType CacheType
	bigCache  *bigcache.BigCache
	mu        sync.RWMutex

	// 消息队列相关
	msgQueue chan []byte
	stopChan chan struct{}
}

var (
	manager *CacheManager
	once    sync.Once
)

// GetCacheManager 获取缓存管理器单例
func GetCacheManager() *CacheManager {
	once.Do(func() {
		manager = &CacheManager{
			msgQueue: make(chan []byte, 1000),
			stopChan: make(chan struct{}),
		}
	})
	return manager
}

// Init 初始化缓存管理器
func Init() error {
	mgr := GetCacheManager()
	conf := config.GetConfig()

	// 检查是否启用 Redis
	if conf.RedisConfig.RedisEnabled {
		// 尝试初始化 Redis
		if err := initRedis(); err != nil {
			log.Printf("Redis 连接失败: %v，将使用 BigCache 内存缓存", err)
			return mgr.initBigCache()
		}

		// 测试 Redis 连接
		if err := testRedisConnection(); err != nil {
			log.Printf("Redis 连接测试失败: %v，将使用 BigCache 内存缓存", err)
			return mgr.initBigCache()
		}

		mgr.cacheType = CacheTypeRedis
		log.Println("缓存模式: Redis")
		return nil
	}

	// Redis 未启用，使用 BigCache
	log.Println("Redis 未启用，使用 BigCache 内存缓存")
	return mgr.initBigCache()
}

// initBigCache 初始化 BigCache
func (m *CacheManager) initBigCache() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	cacheConfig := bigcache.DefaultConfig(10 * time.Minute)
	cacheConfig.CleanWindow = 5 * time.Minute
	cacheConfig.MaxEntriesInWindow = 1000 * 10 * 60
	cacheConfig.MaxEntrySize = 500
	cacheConfig.Verbose = false
	cacheConfig.HardMaxCacheSize = 256 // MB

	cache, err := bigcache.New(context.Background(), cacheConfig)
	if err != nil {
		return err
	}

	m.bigCache = cache
	m.cacheType = CacheTypeBigCache
	log.Println("缓存模式: BigCache (内存缓存)")
	return nil
}

// GetCacheType 获取当前缓存类型
func GetCacheType() CacheType {
	return GetCacheManager().cacheType
}

// IsRedisEnabled 检查是否使用 Redis
func IsRedisEnabled() bool {
	return GetCacheManager().cacheType == CacheTypeRedis
}

// GenerateMessageParam 生成消息队列参数
func GenerateMessageParam(sessionID string, content string, userName string, isUser bool) []byte {
	param := MessageQueueParam{
		SessionID: sessionID,
		Content:   content,
		UserName:  userName,
		IsUser:    isUser,
	}
	data, _ := json.Marshal(param)
	return data
}

// PublishMessage 发布消息到队列
func PublishMessage(data []byte) error {
	mgr := GetCacheManager()

	if mgr.cacheType == CacheTypeRedis {
		return publishMessageToRedis(data)
	}

	// BigCache 模式：使用内存队列
	select {
	case mgr.msgQueue <- data:
		return nil
	default:
		// 队列满了，直接同步写入数据库
		return processMessageDirect(data)
	}
}

// InitMessageQueue 初始化消息队列
func InitMessageQueue() error {
	mgr := GetCacheManager()

	if mgr.cacheType == CacheTypeRedis {
		return initRedisMessageStream()
	}

	// BigCache 模式不需要特殊初始化
	log.Println("消息队列模式: 内存队列 (BigCache)")
	return nil
}

// StartMessageConsumer 启动消息消费者
func StartMessageConsumer() {
	mgr := GetCacheManager()

	if mgr.cacheType == CacheTypeRedis {
		startRedisMessageConsumer()
		return
	}

	// BigCache 模式：启动内存队列消费者
	go mgr.consumeMessagesFromMemory()
}

// consumeMessagesFromMemory 从内存队列消费消息
func (m *CacheManager) consumeMessagesFromMemory() {
	log.Println("启动内存消息队列消费者")

	for {
		select {
		case <-m.stopChan:
			log.Println("内存消息队列消费者已停止")
			return
		case data := <-m.msgQueue:
			if err := processMessageDirect(data); err != nil {
				log.Printf("处理消息失败: %v", err)
				// 重新放入队列重试
				select {
				case m.msgQueue <- data:
				default:
					log.Printf("重试队列已满，消息丢失")
				}
			}
		}
	}
}

// processMessageDirect 直接处理消息（写入数据库）
func processMessageDirect(data []byte) error {
	var param MessageQueueParam
	if err := json.Unmarshal(data, &param); err != nil {
		log.Printf("解析消息失败: %v", err)
		return nil // 解析失败的消息直接跳过
	}

	// 创建消息并存入数据库
	newMsg := &model.Message{
		SessionID: param.SessionID,
		Content:   param.Content,
		UserName:  param.UserName,
		IsUser:    param.IsUser,
	}

	if _, err := message.CreateMessage(newMsg); err != nil {
		return err // 数据库错误需要重试
	}

	log.Printf("消息已持久化 [SessionID=%s, User=%s]", param.SessionID, param.UserName)
	return nil
}

// Stop 停止缓存管理器
func Stop() {
	mgr := GetCacheManager()

	if mgr.cacheType == CacheTypeBigCache {
		close(mgr.stopChan)
		if mgr.bigCache != nil {
			mgr.bigCache.Close()
		}
	}
}

// Set 设置缓存（通用接口）
func Set(key string, value []byte, expiration time.Duration) error {
	mgr := GetCacheManager()

	if mgr.cacheType == CacheTypeRedis {
		return setRedisCache(key, value, expiration)
	}

	// BigCache 不支持自定义过期时间，使用默认配置
	return mgr.bigCache.Set(key, value)
}

// Get 获取缓存（通用接口）
func Get(key string) ([]byte, error) {
	mgr := GetCacheManager()

	if mgr.cacheType == CacheTypeRedis {
		return getRedisCache(key)
	}

	return mgr.bigCache.Get(key)
}

// Delete 删除缓存（通用接口）
func Delete(key string) error {
	mgr := GetCacheManager()

	if mgr.cacheType == CacheTypeRedis {
		return deleteRedisCache(key)
	}

	return mgr.bigCache.Delete(key)
}

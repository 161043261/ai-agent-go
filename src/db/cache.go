package db

import (
	"ai-agent-go/src/config"
	"ai-agent-go/src/model"
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/allegro/bigcache/v3"
)

const (
	PROVIDER_REDIS    = "redis"
	PROVIDER_BIGCACHE = "bigcache"
)

type MessageQueueItem struct {
	SessionId string `json:"session_id"`
	Content   string `json:"content"`
	Username  string `json:"username"`
	IsUser    bool   `json:"is_user"`
}

type CacheManager struct {
	provider     string
	cache        *bigcache.BigCache
	mu           sync.RWMutex
	messageQueue chan []byte
	doneChan     chan struct{}
}

var (
	manager CacheManager
	once    sync.Once
)

func GetCacheManager() *CacheManager {
	once.Do(func() {
		manager = CacheManager{
			messageQueue: make(chan []byte, 1000), // Buffering
			doneChan:     make(chan struct{}),
		}
	})
	return &manager
}

func GetCacheProvider() string {
	return GetCacheManager().provider
}

func IsRedisEnabled() bool {
	return GetCacheManager().provider == PROVIDER_REDIS
}

func Init() error {
	mgr := GetCacheManager()
	cfg := config.GetConfig()

	if cfg.RedisConfig.Enabled {
		initRedis()

		if err := testRedisConnection(); err != nil {
			log.Printf("Connect to redis error: %v, fallback to bigcache", err)
			mgr.provider = PROVIDER_BIGCACHE
			return mgr.initBigcache()
		}

		mgr.provider = PROVIDER_REDIS
		return nil
	}

	mgr.provider = PROVIDER_BIGCACHE
	return mgr.initBigcache()
}

func (m *CacheManager) initBigcache() error {
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
	m.cache = cache
	m.provider = PROVIDER_BIGCACHE
	return nil
}

func GenerateMessageData(sessionId, content, username string, isUser bool) []byte {
	item := MessageQueueItem{
		SessionId: sessionId,
		Content:   content,
		Username:  username,
		IsUser:    isUser,
	}
	data, _ := json.Marshal(item)
	return data
}

func PublishMessage(data []byte) error {
	mgr := GetCacheManager()
	if mgr.provider == PROVIDER_REDIS {
		return publishMessage2redis(data)
	}
	select {
	case mgr.messageQueue <- data:
		return nil
	default:
		return processMessageDirect(data)
	}
}

func processMessageDirect(data []byte) error {
	var item MessageQueueItem
	if err := json.Unmarshal(data, &item); err != nil {
		log.Println("Message json unmarshal error:", err)
		return nil
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
	log.Printf("Message has been persisted, sessionId=%s, username=%s", item.SessionId, item.Username)
	return nil
}

func StopBigcache() {
	mgr := GetCacheManager()

	if mgr.provider == PROVIDER_BIGCACHE {
		close(mgr.doneChan)
		if mgr.cache != nil {
			mgr.cache.Close()
		}
	}
}

func Set(key string, value []byte, expiration time.Duration) error {
	mgr := GetCacheManager()
	if mgr.provider == PROVIDER_REDIS {
		return setRedisCache(key, value, expiration)
	}
	return mgr.cache.Set(key, value)
}

func Get(key string) ([]byte, error) {
	mgr := GetCacheManager()
	if mgr.provider == PROVIDER_REDIS {
		return getRedisCache(key)
	}
	return mgr.cache.Get(key)
}

func Delete(key string) error {
	mgr := GetCacheManager()
	if mgr.provider == PROVIDER_REDIS {
		return deleteRedisCache(key)
	}
	return mgr.cache.Delete(key)
}

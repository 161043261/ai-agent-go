package redis

import (
	"GopherAI/common/cache"
	"context"
	"fmt"
	"strings"

	redisCli "github.com/redis/go-redis/v9"
)

// Rdb 保持向后兼容，供 RAG 模块使用
// 注意：使用前需确保 Redis 已启用
var Rdb *redisCli.Client

// Init 初始化 Redis（兼容旧代码）
// 新代码应使用 cache.Init()
func Init() {
	if cache.IsRedisEnabled() {
		Rdb = cache.GetRedisClient()
	}
}

// IsEnabled 检查 Redis 是否启用
func IsEnabled() bool {
	return cache.IsRedisEnabled()
}

// InitRedisIndex 初始化 Redis 索引，支持按文件名区分
// 注意：此功能仅在 Redis 启用时可用
func InitRedisIndex(ctx context.Context, filename string, dimension int) error {
	if !cache.IsRedisEnabled() {
		return fmt.Errorf("Redis 未启用，无法使用向量索引功能")
	}

	indexName := GenerateIndexName(filename)

	// 检查索引是否存在
	_, err := Rdb.Do(ctx, "FT.INFO", indexName).Result()
	if err == nil {
		fmt.Println("索引已存在，跳过创建")
		return nil
	}

	// 如果索引不存在，创建新索引
	if !strings.Contains(err.Error(), "Unknown index name") {
		return fmt.Errorf("检查索引失败: %w", err)
	}

	fmt.Println("正在创建 Redis 索引...")

	prefix := GenerateIndexNamePrefix(filename)

	// 创建索引
	createArgs := []interface{}{
		"FT.CREATE", indexName,
		"ON", "HASH",
		"PREFIX", "1", prefix,
		"SCHEMA",
		"content", "TEXT",
		"metadata", "TEXT",
		"vector", "VECTOR", "FLAT",
		"6",
		"TYPE", "FLOAT32",
		"DIM", dimension,
		"DISTANCE_METRIC", "COSINE",
	}

	if err := Rdb.Do(ctx, createArgs...).Err(); err != nil {
		return fmt.Errorf("创建索引失败: %w", err)
	}

	fmt.Println("索引创建成功！")
	return nil
}

// DeleteRedisIndex 删除 Redis 索引，支持按文件名区分
func DeleteRedisIndex(ctx context.Context, filename string) error {
	if !cache.IsRedisEnabled() {
		return fmt.Errorf("Redis 未启用，无法删除向量索引")
	}

	indexName := GenerateIndexName(filename)

	// 删除索引
	if err := Rdb.Do(ctx, "FT.DROPINDEX", indexName).Err(); err != nil {
		return fmt.Errorf("删除索引失败: %w", err)
	}

	fmt.Println("索引删除成功！")
	return nil
}

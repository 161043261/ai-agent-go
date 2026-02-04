import NodeCache from 'node-cache';
import { getConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { CacheType, type QueueMessage } from '../../types/index.js';
import { RedisAdapter } from './RedisAdapter.js';

/**
 * 缓存管理器 - 支持 Redis 和内存缓存自动切换
 */
export class CacheManager {
  private static instance: CacheManager | null = null;
  
  private cacheType: CacheType = CacheType.Memory;
  private memoryCache: NodeCache | null = null;
  private redisAdapter: RedisAdapter | null = null;
  
  // 内存消息队列
  private messageQueue: QueueMessage[] = [];
  private messageConsumer: ((msg: QueueMessage) => Promise<void>) | null = null;
  private isConsuming = false;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 初始化缓存
   */
  async init(): Promise<void> {
    const config = getConfig();

    if (config.redis.enabled) {
      try {
        this.redisAdapter = new RedisAdapter();
        await this.redisAdapter.connect();
        this.cacheType = CacheType.Redis;
        logger.info('✅ Cache initialized with Redis');
        return;
      } catch (error) {
        logger.warn('⚠️ Redis connection failed, falling back to memory cache:', error);
      }
    }

    // 使用内存缓存
    this.memoryCache = new NodeCache({
      stdTTL: 3600, // 默认1小时过期
      checkperiod: 120, // 每2分钟检查过期
      useClones: false,
    });
    this.cacheType = CacheType.Memory;
    logger.info('✅ Cache initialized with Memory (NodeCache)');
  }

  /**
   * 获取缓存类型
   */
  getCacheType(): CacheType {
    return this.cacheType;
  }

  /**
   * 检查 Redis 是否可用
   */
  isRedisEnabled(): boolean {
    return this.cacheType === CacheType.Redis && this.redisAdapter !== null;
  }

  /**
   * 获取 Redis 适配器（用于向量搜索等高级功能）
   */
  getRedisAdapter(): RedisAdapter | null {
    return this.redisAdapter;
  }

  // ==================== 通用缓存操作 ====================

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (this.cacheType === CacheType.Redis && this.redisAdapter) {
      await this.redisAdapter.set(key, value, ttl);
    } else if (this.memoryCache) {
      this.memoryCache.set(key, value, ttl || 0);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.cacheType === CacheType.Redis && this.redisAdapter) {
      return this.redisAdapter.get<T>(key);
    } else if (this.memoryCache) {
      return this.memoryCache.get<T>(key);
    }
    return undefined;
  }

  async delete(key: string): Promise<void> {
    if (this.cacheType === CacheType.Redis && this.redisAdapter) {
      await this.redisAdapter.delete(key);
    } else if (this.memoryCache) {
      this.memoryCache.del(key);
    }
  }

  // ==================== 消息队列操作 ====================

  /**
   * 初始化消息队列
   */
  async initMessageQueue(): Promise<void> {
    if (this.cacheType === CacheType.Redis && this.redisAdapter) {
      await this.redisAdapter.initMessageStream();
      logger.info('✅ Message queue initialized with Redis Stream');
    } else {
      logger.info('✅ Message queue initialized with Memory Queue');
    }
  }

  /**
   * 发布消息到队列
   */
  async publishMessage(message: QueueMessage): Promise<void> {
    if (this.cacheType === CacheType.Redis && this.redisAdapter) {
      await this.redisAdapter.publishMessage(message);
    } else {
      // 内存队列
      this.messageQueue.push(message);
      this.processMemoryQueue();
    }
  }

  /**
   * 启动消息消费者
   */
  startMessageConsumer(handler: (msg: QueueMessage) => Promise<void>): void {
    this.messageConsumer = handler;

    if (this.cacheType === CacheType.Redis && this.redisAdapter) {
      this.redisAdapter.startConsumer(handler);
    } else {
      // 内存队列消费者已在 publishMessage 中触发
      logger.info('✅ Memory queue consumer ready');
    }
  }

  /**
   * 处理内存队列
   */
  private async processMemoryQueue(): Promise<void> {
    if (this.isConsuming || !this.messageConsumer) return;

    this.isConsuming = true;
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message && this.messageConsumer) {
          try {
            await this.messageConsumer(message);
          } catch (error) {
            logger.error('Memory queue message processing failed:', error);
          }
        }
      }
    } finally {
      this.isConsuming = false;
    }
  }

  /**
   * 关闭缓存连接
   */
  async close(): Promise<void> {
    if (this.redisAdapter) {
      await this.redisAdapter.close();
    }
    if (this.memoryCache) {
      this.memoryCache.close();
    }
    CacheManager.instance = null;
    logger.info('Cache manager closed');
  }
}

// 便捷函数
export function getCacheManager(): CacheManager {
  return CacheManager.getInstance();
}

export default CacheManager;

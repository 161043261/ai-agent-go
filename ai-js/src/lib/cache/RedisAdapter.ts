import Redis from 'ioredis';
import { getConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { QueueMessage } from '../../types/index.js';

// Redis Stream 常量
const MESSAGE_STREAM_KEY = 'gopherai:message:stream';
const MESSAGE_GROUP_NAME = 'message_consumer_group';
const MESSAGE_CONSUMER_NAME = 'message_consumer_1';

/**
 * Redis 适配器
 */
export class RedisAdapter {
  private client: Redis | null = null;
  private isConnected = false;
  private consumerRunning = false;

  /**
   * 连接 Redis
   */
  async connect(): Promise<void> {
    const config = getConfig();
    
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // 停止重试
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
    });

    // 等待连接
    await new Promise<void>((resolve, reject) => {
      this.client!.once('connect', () => {
        this.isConnected = true;
        resolve();
      });
      this.client!.once('error', (err) => {
        reject(err);
      });
    });

    // 测试连接
    await this.client.ping();
    logger.info(`✅ Redis connected to ${config.redis.host}:${config.redis.port}`);
  }

  /**
   * 获取 Redis 客户端
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * 检查连接状态
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  // ==================== 基础缓存操作 ====================

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.client) return;
    
    const serialized = JSON.stringify(value);
    if (ttl && ttl > 0) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.client) return undefined;
    
    const value = await this.client.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return undefined;
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  // ==================== 消息队列 (Redis Stream) ====================

  /**
   * 初始化 Redis Stream
   */
  async initMessageStream(): Promise<void> {
    if (!this.client) return;

    try {
      // 检查 Stream 是否存在
      const exists = await this.client.exists(MESSAGE_STREAM_KEY);
      
      if (!exists) {
        // 创建 Stream（通过添加一条初始消息）
        await this.client.xadd(MESSAGE_STREAM_KEY, '*', 'init', 'true');
      }

      // 尝试创建消费者组
      try {
        await this.client.xgroup('CREATE', MESSAGE_STREAM_KEY, MESSAGE_GROUP_NAME, '0', 'MKSTREAM');
        logger.info('Created Redis Stream consumer group');
      } catch (error) {
        // 组已存在，忽略错误
        if (!(error as Error).message.includes('BUSYGROUP')) {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Redis Stream:', error);
      throw error;
    }
  }

  /**
   * 发布消息到 Stream
   */
  async publishMessage(message: QueueMessage): Promise<void> {
    if (!this.client) return;

    await this.client.xadd(
      MESSAGE_STREAM_KEY,
      '*',
      'sessionId', message.sessionId,
      'userName', message.userName,
      'content', message.content,
      'isUser', message.isUser ? '1' : '0',
      'createdAt', message.createdAt?.toISOString() || new Date().toISOString()
    );
  }

  /**
   * 启动消费者
   */
  startConsumer(handler: (msg: QueueMessage) => Promise<void>): void {
    if (!this.client || this.consumerRunning) return;

    this.consumerRunning = true;
    this.consumeLoop(handler);
    logger.info('✅ Redis Stream consumer started');
  }

  /**
   * 消费循环
   */
  private async consumeLoop(handler: (msg: QueueMessage) => Promise<void>): Promise<void> {
    while (this.consumerRunning && this.client) {
      try {
        const results = await this.client.xreadgroup(
          'GROUP', MESSAGE_GROUP_NAME, MESSAGE_CONSUMER_NAME,
          'COUNT', '10',
          'BLOCK', '5000',
          'STREAMS', MESSAGE_STREAM_KEY, '>'
        );

        if (!results) continue;

        for (const [, messages] of results) {
          for (const [messageId, fields] of messages) {
            // 解析消息
            const fieldMap: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              fieldMap[fields[i]] = fields[i + 1];
            }

            // 跳过初始化消息
            if (fieldMap.init === 'true') {
              await this.client.xack(MESSAGE_STREAM_KEY, MESSAGE_GROUP_NAME, messageId);
              continue;
            }

            const queueMessage: QueueMessage = {
              sessionId: fieldMap.sessionId,
              userName: fieldMap.userName,
              content: fieldMap.content,
              isUser: fieldMap.isUser === '1',
              createdAt: new Date(fieldMap.createdAt),
            };

            try {
              await handler(queueMessage);
              // 确认消息处理完成
              await this.client.xack(MESSAGE_STREAM_KEY, MESSAGE_GROUP_NAME, messageId);
            } catch (error) {
              logger.error('Message processing failed:', error);
            }
          }
        }
      } catch (error) {
        if (this.consumerRunning) {
          logger.error('Redis Stream consume error:', error);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }

  /**
   * 停止消费者
   */
  stopConsumer(): void {
    this.consumerRunning = false;
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    this.stopConsumer();
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

export default RedisAdapter;

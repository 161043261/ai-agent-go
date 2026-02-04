import { getConfig } from './config/index.js';
import { createApp } from './app.js';
import { initDatabase, closeDatabase } from './lib/database.js';
import { getCacheManager } from './lib/cache/CacheManager.js';
import { getSessionService } from './services/session.service.js';
import { getMessageRepository } from './repositories/message.repository.js';
import { logger } from './utils/logger.js';

/**
 * 消息消费者处理函数
 */
async function handleMessage(message: {
  sessionId: string;
  userName: string;
  content: string;
  isUser: boolean;
  createdAt?: Date;
}): Promise<void> {
  const messageRepo = getMessageRepository();
  
  try {
    await messageRepo.create({
      sessionId: message.sessionId,
      userName: message.userName,
      content: message.content,
      isUser: message.isUser,
    });
  } catch (error) {
    logger.error('Failed to save message to database:', error);
  }
}

/**
 * 启动服务器
 */
async function main(): Promise<void> {
  const config = getConfig();

  try {
    // 1. 初始化数据库
    await initDatabase();

    // 2. 初始化缓存
    const cacheManager = getCacheManager();
    await cacheManager.init();

    // 3. 初始化消息队列
    await cacheManager.initMessageQueue();

    // 4. 启动消息消费者
    cacheManager.startMessageConsumer(handleMessage);

    // 5. 从数据库加载历史消息到内存
    const sessionService = getSessionService();
    await sessionService.loadAllMessagesFromDB();

    // 6. 创建并启动 HTTP 服务
    const app = await createApp();
    
    await app.listen({
      host: config.server.host,
      port: config.server.port,
    });

    logger.info(`🚀 Server running at http://${config.server.host}:${config.server.port}`);
    logger.info(`📝 API Documentation: http://${config.server.host}:${config.server.port}/health`);

    // 优雅关闭
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await app.close();
        await cacheManager.close();
        await closeDatabase();
        logger.info('Server closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 启动应用
main();

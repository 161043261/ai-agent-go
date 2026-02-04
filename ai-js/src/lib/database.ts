import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Prisma 客户端单例
let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // 查询日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query' as never, (e: { query: string; duration: number }) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Duration: ${e.duration}ms`);
      });
    }
  }
  return prisma;
}

// 初始化数据库连接
export async function initDatabase(): Promise<void> {
  const client = getPrisma();
  try {
    await client.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

// 关闭数据库连接
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Database connection closed');
  }
}

export default getPrisma;

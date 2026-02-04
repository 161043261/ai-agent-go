import { getPrisma } from '../lib/database.js';
import type { Message } from '@prisma/client';

/**
 * 消息数据访问层
 */
export class MessageRepository {
  /**
   * 获取会话的所有消息
   */
  async findBySessionId(sessionId: string): Promise<Message[]> {
    const prisma = getPrisma();
    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 批量获取多个会话的消息
   */
  async findBySessionIds(sessionIds: string[]): Promise<Message[]> {
    const prisma = getPrisma();
    return prisma.message.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 创建消息
   */
  async create(data: {
    sessionId: string;
    userName: string;
    content: string;
    isUser: boolean;
  }): Promise<Message> {
    const prisma = getPrisma();
    return prisma.message.create({
      data: {
        sessionId: data.sessionId,
        userName: data.userName,
        content: data.content,
        isUser: data.isUser,
      },
    });
  }

  /**
   * 获取所有消息（用于启动时加载到内存）
   */
  async findAll(): Promise<Message[]> {
    const prisma = getPrisma();
    return prisma.message.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 删除会话的所有消息
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.message.deleteMany({
      where: { sessionId },
    });
  }
}

// 单例
let messageRepository: MessageRepository | null = null;

export function getMessageRepository(): MessageRepository {
  if (!messageRepository) {
    messageRepository = new MessageRepository();
  }
  return messageRepository;
}

export default MessageRepository;

import { getPrisma } from '../lib/database.js';
import type { Session } from '@prisma/client';

/**
 * 会话数据访问层
 */
export class SessionRepository {
  /**
   * 通过 ID 查找会话
   */
  async findById(id: string): Promise<Session | null> {
    const prisma = getPrisma();
    return prisma.session.findUnique({
      where: { id, deletedAt: null },
    });
  }

  /**
   * 获取用户的所有会话
   */
  async findByUserName(userName: string): Promise<Session[]> {
    const prisma = getPrisma();
    return prisma.session.findMany({
      where: { userName, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 创建会话
   */
  async create(data: {
    id: string;
    userName: string;
    title?: string;
  }): Promise<Session> {
    const prisma = getPrisma();
    return prisma.session.create({
      data: {
        id: data.id,
        userName: data.userName,
        title: data.title,
      },
    });
  }

  /**
   * 更新会话标题
   */
  async updateTitle(id: string, title: string): Promise<Session> {
    const prisma = getPrisma();
    return prisma.session.update({
      where: { id },
      data: { title },
    });
  }

  /**
   * 软删除会话
   */
  async softDelete(id: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.session.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

// 单例
let sessionRepository: SessionRepository | null = null;

export function getSessionRepository(): SessionRepository {
  if (!sessionRepository) {
    sessionRepository = new SessionRepository();
  }
  return sessionRepository;
}

export default SessionRepository;

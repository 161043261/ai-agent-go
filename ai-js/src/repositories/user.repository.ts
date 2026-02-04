import { getPrisma } from '../lib/database.js';
import type { User } from '@prisma/client';

/**
 * 用户数据访问层
 */
export class UserRepository {
  /**
   * 通过用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const prisma = getPrisma();
    return prisma.user.findUnique({
      where: { username, deletedAt: null },
    });
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const prisma = getPrisma();
    return prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  /**
   * 创建用户
   */
  async create(data: {
    username: string;
    email: string;
    password: string;
    name?: string;
  }): Promise<User> {
    const prisma = getPrisma();
    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });
  }

  /**
   * 检查用户名是否存在
   */
  async existsByUsername(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  /**
   * 检查邮箱是否存在
   */
  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }
}

// 单例
let userRepository: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!userRepository) {
    userRepository = new UserRepository();
  }
  return userRepository;
}

export default UserRepository;

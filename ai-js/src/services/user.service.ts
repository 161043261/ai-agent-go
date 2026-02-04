import { getUserRepository } from '../repositories/user.repository.js';
import { md5, generateRandomNumbers } from '../utils/crypto.js';
import { StatusCode } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface LoginResult {
  success: boolean;
  code: StatusCode;
  userId?: number;
  username?: string;
}

export interface RegisterResult {
  success: boolean;
  code: StatusCode;
  userId?: number;
  username?: string;
}

/**
 * 用户服务
 */
export class UserService {
  private userRepo = getUserRepository();

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // 查找用户
    const user = await this.userRepo.findByEmail(email);
    
    if (!user) {
      return { success: false, code: StatusCode.UserNotExist };
    }

    // 验证密码 (MD5)
    const hashedPassword = md5(password);
    if (user.password !== hashedPassword) {
      return { success: false, code: StatusCode.InvalidPassword };
    }

    logger.info(`User logged in: ${user.username}`);
    
    return {
      success: true,
      code: StatusCode.Success,
      userId: user.id,
      username: user.username,
    };
  }

  /**
   * 用户注册
   */
  async register(email: string, password: string): Promise<RegisterResult> {
    // 检查邮箱是否已注册
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      return { success: false, code: StatusCode.EmailExist };
    }

    // 生成 11 位随机用户名
    let username: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      username = generateRandomNumbers(11);
      const exists = await this.userRepo.existsByUsername(username);
      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      logger.error('Failed to generate unique username after max attempts');
      return { success: false, code: StatusCode.ServerBusy };
    }

    // 创建用户
    const hashedPassword = md5(password);
    const user = await this.userRepo.create({
      username,
      email,
      password: hashedPassword,
    });

    logger.info(`New user registered: ${username}`);

    return {
      success: true,
      code: StatusCode.Success,
      userId: user.id,
      username: user.username,
    };
  }
}

// 单例
let userService: UserService | null = null;

export function getUserService(): UserService {
  if (!userService) {
    userService = new UserService();
  }
  return userService;
}

export default UserService;

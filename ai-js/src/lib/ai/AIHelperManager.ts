import { AIHelper, type SaveMessageFunc, type StoredMessage } from './AIHelper.js';
import { getAIModelFactory } from './AIModelFactory.js';
import type { ModelType, SessionInfo } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * AI 助手管理器 - 管理所有用户的所有会话
 */
export class AIHelperManager {
  private static instance: AIHelperManager | null = null;
  
  // map[userName][sessionId] => AIHelper
  private helpers: Map<string, Map<string, AIHelper>> = new Map();
  
  // 消息保存回调
  private saveFunc: SaveMessageFunc | null = null;

  private constructor() {}

  static getInstance(): AIHelperManager {
    if (!AIHelperManager.instance) {
      AIHelperManager.instance = new AIHelperManager();
    }
    return AIHelperManager.instance;
  }

  /**
   * 设置消息保存回调
   */
  setSaveFunc(func: SaveMessageFunc): void {
    this.saveFunc = func;
  }

  /**
   * 获取或创建 AIHelper
   */
  getOrCreateAIHelper(
    userName: string,
    sessionId: string,
    modelType: ModelType = '1'
  ): AIHelper {
    // 获取用户的会话映射
    let userHelpers = this.helpers.get(userName);
    if (!userHelpers) {
      userHelpers = new Map();
      this.helpers.set(userName, userHelpers);
    }

    // 获取或创建 AIHelper
    let helper = userHelpers.get(sessionId);
    if (!helper) {
      const factory = getAIModelFactory();
      const model = factory.createModel(modelType, { userName });
      
      helper = new AIHelper(model, sessionId, userName, this.saveFunc || undefined);
      userHelpers.set(sessionId, helper);
      
      logger.info(`Created new AIHelper for user ${userName}, session ${sessionId}`);
    }

    return helper;
  }

  /**
   * 获取已存在的 AIHelper
   */
  getAIHelper(userName: string, sessionId: string): AIHelper | null {
    const userHelpers = this.helpers.get(userName);
    if (!userHelpers) return null;
    return userHelpers.get(sessionId) || null;
  }

  /**
   * 移除 AIHelper
   */
  removeAIHelper(userName: string, sessionId: string): boolean {
    const userHelpers = this.helpers.get(userName);
    if (!userHelpers) return false;
    
    const deleted = userHelpers.delete(sessionId);
    
    // 如果用户没有会话了，移除用户映射
    if (userHelpers.size === 0) {
      this.helpers.delete(userName);
    }
    
    return deleted;
  }

  /**
   * 获取用户的所有会话 ID
   */
  getUserSessionIds(userName: string): string[] {
    const userHelpers = this.helpers.get(userName);
    if (!userHelpers) return [];
    return Array.from(userHelpers.keys());
  }

  /**
   * 获取用户的所有会话信息
   */
  getUserSessions(userName: string): SessionInfo[] {
    const userHelpers = this.helpers.get(userName);
    if (!userHelpers) return [];
    
    const sessions: SessionInfo[] = [];
    for (const [sessionId, helper] of userHelpers) {
      // 获取第一条消息作为标题
      const messages = helper.getMessages();
      const firstUserMessage = messages.find((m) => m.isUser);
      const title = firstUserMessage?.content.substring(0, 50) || 'New Chat';
      
      sessions.push({
        sessionId,
        name: title,
      });
    }
    
    return sessions;
  }

  /**
   * 加载消息到已有的 AIHelper（用于启动时恢复数据）
   */
  loadMessagesToHelper(
    userName: string,
    sessionId: string,
    messages: StoredMessage[],
    modelType: ModelType = '1'
  ): AIHelper {
    const helper = this.getOrCreateAIHelper(userName, sessionId, modelType);
    helper.loadMessages(messages);
    return helper;
  }

  /**
   * 获取所有用户名
   */
  getAllUserNames(): string[] {
    return Array.from(this.helpers.keys());
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalUsers: number; totalSessions: number } {
    let totalSessions = 0;
    for (const userHelpers of this.helpers.values()) {
      totalSessions += userHelpers.size;
    }
    return {
      totalUsers: this.helpers.size,
      totalSessions,
    };
  }
}

// 便捷函数
export function getAIHelperManager(): AIHelperManager {
  return AIHelperManager.getInstance();
}

export default AIHelperManager;

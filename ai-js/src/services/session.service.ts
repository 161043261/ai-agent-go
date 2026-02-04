import { getSessionRepository } from '../repositories/session.repository.js';
import { getMessageRepository } from '../repositories/message.repository.js';
import { getAIHelperManager, type StoredMessage } from '../lib/ai/index.js';
import { getCacheManager } from '../lib/cache/CacheManager.js';
import { generateUUID } from '../utils/crypto.js';
import { generateSessionTitle, convertToChatHistory } from '../utils/helpers.js';
import { StatusCode, type SessionInfo, type ChatMessage, type ModelType } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface SessionResult {
  success: boolean;
  code: StatusCode;
  data?: unknown;
}

/**
 * 会话服务
 */
export class SessionService {
  private sessionRepo = getSessionRepository();
  private messageRepo = getMessageRepository();
  private aiManager = getAIHelperManager();
  private cacheManager = getCacheManager();

  constructor() {
    // 设置消息保存回调
    this.aiManager.setSaveFunc(async (message: StoredMessage) => {
      // 发布到消息队列进行异步持久化
      await this.cacheManager.publishMessage({
        sessionId: message.sessionId,
        userName: message.userName,
        content: message.content,
        isUser: message.isUser,
        createdAt: message.createdAt,
      });
      return message;
    });
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(userName: string): Promise<SessionInfo[]> {
    // 先从内存获取
    const memorySessions = this.aiManager.getUserSessions(userName);
    
    if (memorySessions.length > 0) {
      return memorySessions;
    }

    // 从数据库获取
    const dbSessions = await this.sessionRepo.findByUserName(userName);
    return dbSessions.map((s) => ({
      sessionId: s.id,
      name: s.title || 'New Chat',
    }));
  }

  /**
   * 创建新会话并发送消息（同步）
   */
  async createSessionAndSendMessage(
    userName: string,
    message: string,
    modelType: ModelType = '1'
  ): Promise<SessionResult> {
    try {
      // 创建会话
      const sessionId = generateUUID();
      const title = generateSessionTitle(message);
      
      await this.sessionRepo.create({
        id: sessionId,
        userName,
        title,
      });

      // 创建 AIHelper 并发送消息
      const helper = this.aiManager.getOrCreateAIHelper(userName, sessionId, modelType);
      const response = await helper.generateResponse(message);

      return {
        success: true,
        code: StatusCode.Success,
        data: {
          sessionId,
          response,
        },
      };
    } catch (error) {
      logger.error('Create session and send message error:', error);
      return {
        success: false,
        code: StatusCode.AIModelFail,
      };
    }
  }

  /**
   * 向已有会话发送消息（同步）
   */
  async sendMessage(
    userName: string,
    sessionId: string,
    message: string,
    modelType: ModelType = '1'
  ): Promise<SessionResult> {
    try {
      // 获取或创建 AIHelper
      let helper = this.aiManager.getAIHelper(userName, sessionId);
      
      if (!helper) {
        // 检查会话是否存在
        const session = await this.sessionRepo.findById(sessionId);
        if (!session || session.userName !== userName) {
          return {
            success: false,
            code: StatusCode.InvalidParams,
          };
        }

        // 创建 AIHelper 并加载历史消息
        helper = this.aiManager.getOrCreateAIHelper(userName, sessionId, modelType);
        const dbMessages = await this.messageRepo.findBySessionId(sessionId);
        helper.loadMessages(dbMessages.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          userName: m.userName,
          content: m.content,
          isUser: m.isUser,
          createdAt: m.createdAt,
        })));
      }

      // 发送消息
      const response = await helper.generateResponse(message);

      return {
        success: true,
        code: StatusCode.Success,
        data: {
          response,
        },
      };
    } catch (error) {
      logger.error('Send message error:', error);
      return {
        success: false,
        code: StatusCode.AIModelFail,
      };
    }
  }

  /**
   * 创建新会话并流式发送消息
   */
  async createSessionAndStreamMessage(
    userName: string,
    message: string,
    modelType: ModelType = '1',
    onChunk: (chunk: string) => void
  ): Promise<{ sessionId: string; response: string } | null> {
    try {
      // 创建会话
      const sessionId = generateUUID();
      const title = generateSessionTitle(message);
      
      await this.sessionRepo.create({
        id: sessionId,
        userName,
        title,
      });

      // 创建 AIHelper 并流式发送消息
      const helper = this.aiManager.getOrCreateAIHelper(userName, sessionId, modelType);
      const response = await helper.streamResponse(message, onChunk);

      return { sessionId, response };
    } catch (error) {
      logger.error('Create session and stream message error:', error);
      return null;
    }
  }

  /**
   * 向已有会话流式发送消息
   */
  async streamMessage(
    userName: string,
    sessionId: string,
    message: string,
    modelType: ModelType = '1',
    onChunk: (chunk: string) => void
  ): Promise<string | null> {
    try {
      // 获取或创建 AIHelper
      let helper = this.aiManager.getAIHelper(userName, sessionId);
      
      if (!helper) {
        // 检查会话是否存在
        const session = await this.sessionRepo.findById(sessionId);
        if (!session || session.userName !== userName) {
          return null;
        }

        // 创建 AIHelper 并加载历史消息
        helper = this.aiManager.getOrCreateAIHelper(userName, sessionId, modelType);
        const dbMessages = await this.messageRepo.findBySessionId(sessionId);
        helper.loadMessages(dbMessages.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          userName: m.userName,
          content: m.content,
          isUser: m.isUser,
          createdAt: m.createdAt,
        })));
      }

      // 流式发送消息
      return await helper.streamResponse(message, onChunk);
    } catch (error) {
      logger.error('Stream message error:', error);
      return null;
    }
  }

  /**
   * 获取聊天历史
   */
  async getChatHistory(userName: string, sessionId: string): Promise<ChatMessage[]> {
    // 先从内存获取
    const helper = this.aiManager.getAIHelper(userName, sessionId);
    
    if (helper) {
      return convertToChatHistory(helper.getMessages());
    }

    // 从数据库获取
    const dbMessages = await this.messageRepo.findBySessionId(sessionId);
    return convertToChatHistory(dbMessages);
  }

  /**
   * 从数据库加载所有消息到内存（启动时调用）
   */
  async loadAllMessagesFromDB(): Promise<void> {
    try {
      const allMessages = await this.messageRepo.findAll();
      
      // 按会话分组
      const messagesBySession = new Map<string, StoredMessage[]>();
      
      for (const msg of allMessages) {
        const key = `${msg.userName}:${msg.sessionId}`;
        if (!messagesBySession.has(key)) {
          messagesBySession.set(key, []);
        }
        messagesBySession.get(key)!.push({
          id: msg.id,
          sessionId: msg.sessionId,
          userName: msg.userName,
          content: msg.content,
          isUser: msg.isUser,
          createdAt: msg.createdAt,
        });
      }

      // 加载到 AIHelperManager
      for (const [key, messages] of messagesBySession) {
        const [userName, sessionId] = key.split(':');
        this.aiManager.loadMessagesToHelper(userName, sessionId, messages);
      }

      const stats = this.aiManager.getStats();
      logger.info(`Loaded ${allMessages.length} messages into ${stats.totalSessions} sessions for ${stats.totalUsers} users`);
    } catch (error) {
      logger.error('Load messages from DB error:', error);
    }
  }
}

// 单例
let sessionService: SessionService | null = null;

export function getSessionService(): SessionService {
  if (!sessionService) {
    sessionService = new SessionService();
  }
  return sessionService;
}

export default SessionService;

import type { AIModel } from './AIModel.js';
import type { SchemaMessage, QueueMessage } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * 消息存储结构
 */
export interface StoredMessage {
  id?: number;
  sessionId: string;
  userName: string;
  content: string;
  isUser: boolean;
  createdAt?: Date;
}

/**
 * 消息保存回调函数类型
 */
export type SaveMessageFunc = (message: StoredMessage) => Promise<StoredMessage>;

/**
 * AI 助手 - 管理单个会话的消息和模型交互
 */
export class AIHelper {
  private model: AIModel;
  private messages: StoredMessage[] = [];
  private sessionId: string;
  private userName: string;
  private saveFunc: SaveMessageFunc | null = null;

  constructor(
    model: AIModel,
    sessionId: string,
    userName: string,
    saveFunc?: SaveMessageFunc
  ) {
    this.model = model;
    this.sessionId = sessionId;
    this.userName = userName;
    this.saveFunc = saveFunc || null;
  }

  /**
   * 获取会话 ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 获取用户名
   */
  getUserName(): string {
    return this.userName;
  }

  /**
   * 获取模型类型
   */
  getModelType(): string {
    return this.model.getModelType();
  }

  /**
   * 添加消息（仅内存）
   */
  addMessage(content: string, isUser: boolean): StoredMessage {
    const message: StoredMessage = {
      sessionId: this.sessionId,
      userName: this.userName,
      content,
      isUser,
      createdAt: new Date(),
    };
    this.messages.push(message);
    return message;
  }

  /**
   * 添加消息并持久化
   */
  async addAndSaveMessage(content: string, isUser: boolean): Promise<StoredMessage> {
    const message = this.addMessage(content, isUser);
    
    if (this.saveFunc) {
      const saved = await this.saveFunc(message);
      message.id = saved.id;
    }
    
    return message;
  }

  /**
   * 批量加载消息（用于启动时从数据库恢复）
   */
  loadMessages(messages: StoredMessage[]): void {
    this.messages = messages;
  }

  /**
   * 获取所有消息
   */
  getMessages(): StoredMessage[] {
    return [...this.messages];
  }

  /**
   * 转换为 Schema 消息格式（用于 AI 模型）
   */
  private toSchemaMessages(): SchemaMessage[] {
    return this.messages.map((m) => ({
      role: m.isUser ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  /**
   * 生成 AI 回复（同步）
   */
  async generateResponse(userMessage: string): Promise<string> {
    // 添加用户消息
    await this.addAndSaveMessage(userMessage, true);

    try {
      // 调用 AI 模型
      const response = await this.model.generateResponse(this.toSchemaMessages());
      
      // 添加 AI 回复
      await this.addAndSaveMessage(response, false);
      
      return response;
    } catch (error) {
      logger.error('AIHelper generateResponse error:', error);
      throw error;
    }
  }

  /**
   * 生成 AI 回复（流式）
   */
  async streamResponse(
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    // 添加用户消息
    await this.addAndSaveMessage(userMessage, true);

    try {
      // 调用 AI 模型（流式）
      const fullResponse = await this.model.streamResponse(
        this.toSchemaMessages(),
        onChunk
      );
      
      // 添加 AI 回复
      await this.addAndSaveMessage(fullResponse, false);
      
      return fullResponse;
    } catch (error) {
      logger.error('AIHelper streamResponse error:', error);
      throw error;
    }
  }

  /**
   * 转换为队列消息格式
   */
  toQueueMessage(content: string, isUser: boolean): QueueMessage {
    return {
      sessionId: this.sessionId,
      userName: this.userName,
      content,
      isUser,
      createdAt: new Date(),
    };
  }
}

export default AIHelper;

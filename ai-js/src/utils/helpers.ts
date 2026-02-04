import { promises as fs } from 'fs';
import path from 'path';
import type { SchemaMessage, ChatMessage } from '../types/index.js';

/**
 * 将数据库消息转换为 Schema 消息格式（用于 AI 模型）
 */
export function convertToSchemaMessages(
  messages: Array<{ content: string; isUser: boolean }>
): SchemaMessage[] {
  return messages.map((msg) => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content,
  }));
}

/**
 * 将 Schema 消息转换为聊天历史格式
 */
export function convertToChatHistory(
  messages: Array<{ content: string; isUser: boolean }>
): ChatMessage[] {
  return messages.map((msg) => ({
    is_user: msg.isUser,
    content: msg.content,
  }));
}

/**
 * 删除目录中的所有文件
 */
export async function removeAllFilesInDir(dirPath: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          await fs.unlink(filePath);
        }
      })
    );
  } catch (error) {
    // 目录不存在时忽略错误
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * 校验文件类型（仅允许 .md 和 .txt）
 */
export function validateFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.md' || ext === '.txt';
}

/**
 * 生成带有时间戳的文件名
 */
export function generateTimestampFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  return `${timestamp}${ext}`;
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 截取字符串作为会话标题
 */
export function generateSessionTitle(message: string, maxLength = 50): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength) + '...';
}

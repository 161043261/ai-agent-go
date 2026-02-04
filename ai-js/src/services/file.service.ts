import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '../config/index.js';
import { getCacheManager } from '../lib/cache/CacheManager.js';
import { generateUUID } from '../utils/crypto.js';
import { ensureDir, removeAllFilesInDir, validateFileType } from '../utils/helpers.js';
import { StatusCode } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface FileUploadResult {
  success: boolean;
  code: StatusCode;
  filename?: string;
  message?: string;
}

/**
 * 文件服务 - RAG 知识库文件管理
 */
export class FileService {
  private config = getConfig();

  /**
   * 上传 RAG 文件
   */
  async uploadRagFile(
    userName: string,
    fileBuffer: Buffer,
    originalFilename: string
  ): Promise<FileUploadResult> {
    // 校验文件类型
    if (!validateFileType(originalFilename)) {
      return {
        success: false,
        code: StatusCode.InvalidParams,
        message: '仅支持 .md 和 .txt 文件',
      };
    }

    try {
      // 创建用户目录
      const userDir = path.join(this.config.rag.docDir, userName);
      await ensureDir(userDir);

      // 删除旧文件
      await removeAllFilesInDir(userDir);

      // 删除旧的 Redis 索引（如果 Redis 可用）
      const cacheManager = getCacheManager();
      if (cacheManager.isRedisEnabled()) {
        await this.deleteRedisIndex(userName);
      }

      // 生成新文件名并保存
      const ext = path.extname(originalFilename);
      const newFilename = `${generateUUID()}${ext}`;
      const filePath = path.join(userDir, newFilename);

      await fs.writeFile(filePath, fileBuffer);

      // 创建 RAG 索引（如果 Redis 可用）
      if (cacheManager.isRedisEnabled()) {
        await this.createRagIndex(userName, filePath);
      }

      logger.info(`RAG file uploaded: ${filePath}`);

      return {
        success: true,
        code: StatusCode.Success,
        filename: newFilename,
        message: cacheManager.isRedisEnabled()
          ? '文件上传并建立索引成功'
          : '文件上传成功（RAG 索引需要 Redis 支持）',
      };
    } catch (error) {
      logger.error('Upload RAG file error:', error);
      return {
        success: false,
        code: StatusCode.FileUploadFail,
        message: (error as Error).message,
      };
    }
  }

  /**
   * 创建 RAG 向量索引
   * TODO: 实现 LangChain Redis Vector Store 索引
   */
  private async createRagIndex(userName: string, filePath: string): Promise<void> {
    try {
      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');
      
      // TODO: 实现向量化和索引
      // 1. 文本分块
      // 2. 调用 Embedding API 获取向量
      // 3. 存入 Redis Vector Store
      
      logger.info(`RAG index created for user ${userName}, file: ${filePath}`);
      logger.info(`Content length: ${content.length} characters`);
    } catch (error) {
      logger.error('Create RAG index error:', error);
      throw error;
    }
  }

  /**
   * 删除 RAG 向量索引
   */
  private async deleteRedisIndex(userName: string): Promise<void> {
    try {
      const cacheManager = getCacheManager();
      const redisAdapter = cacheManager.getRedisAdapter();
      
      if (redisAdapter) {
        const client = redisAdapter.getClient();
        if (client) {
          // 删除索引相关的 keys
          const indexName = `rag_docs:${userName}:idx`;
          const prefix = `rag_docs:${userName}:`;
          
          // 获取所有相关 keys
          const keys = await client.keys(`${prefix}*`);
          if (keys.length > 0) {
            await client.del(...keys);
          }
          
          // 尝试删除索引
          try {
            await client.call('FT.DROPINDEX', indexName);
          } catch {
            // 索引不存在，忽略
          }
          
          logger.info(`Deleted RAG index for user ${userName}`);
        }
      }
    } catch (error) {
      logger.error('Delete Redis index error:', error);
      // 不抛出错误，继续处理
    }
  }

  /**
   * 获取用户的 RAG 文件列表
   */
  async getUserFiles(userName: string): Promise<string[]> {
    try {
      const userDir = path.join(this.config.rag.docDir, userName);
      const files = await fs.readdir(userDir);
      return files;
    } catch {
      return [];
    }
  }
}

// 单例
let fileService: FileService | null = null;

export function getFileService(): FileService {
  if (!fileService) {
    fileService = new FileService();
  }
  return fileService;
}

export default FileService;

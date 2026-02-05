import 'dotenv/config';
import type { AppConfig } from '../types/index.js';

// 从环境变量加载配置
function loadConfig(): AppConfig {
  return {
    server: {
      host: process.env.HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '9090', 10),
      appName: process.env.APP_NAME || 'GopherAI',
    },
    database: {
      url: process.env.DATABASE_URL || 'mysql://root:123456@localhost:3306/GopherAI',
    },
    redis: {
      enabled: process.env.REDIS_ENABLED !== 'false',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'GopherAI-v1',
      expiresIn: process.env.JWT_EXPIRES_IN || '8760h',
      issuer: process.env.JWT_ISSUER || 'huanheart',
      subject: process.env.JWT_SUBJECT || 'GopherAI',
    },
    rag: {
      embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-v4',
      chatModel: process.env.RAG_CHAT_MODEL || 'qwen-turbo',
      docDir: process.env.RAG_DOC_DIR || './docs',
      baseUrl: process.env.RAG_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      dimension: parseInt(process.env.RAG_DIMENSION || '1024', 10),
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    },
  };
}

// 单例配置对象
let config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

export default getConfig;

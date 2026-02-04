// ==================== 通用类型定义 ====================

// API 响应状态码
export enum StatusCode {
  Success = 1000,
  InvalidParams = 2001,
  UserExist = 2002,
  UserNotExist = 2003,
  InvalidPassword = 2004,
  InvalidToken = 2006,
  EmailExist = 2007,
  ServerBusy = 4001,
  AIModelFail = 5003,
  FileUploadFail = 5004,
  ImageRecognizeFail = 5005,
}

// 状态码消息映射
export const StatusMessage: Record<StatusCode, string> = {
  [StatusCode.Success]: '操作成功',
  [StatusCode.InvalidParams]: '请求参数错误',
  [StatusCode.UserExist]: '用户名已存在',
  [StatusCode.UserNotExist]: '用户不存在',
  [StatusCode.InvalidPassword]: '密码错误',
  [StatusCode.InvalidToken]: '无效的Token',
  [StatusCode.EmailExist]: '邮箱已被注册',
  [StatusCode.ServerBusy]: '服务繁忙，请稍后重试',
  [StatusCode.AIModelFail]: '模型运行失败',
  [StatusCode.FileUploadFail]: '文件上传失败',
  [StatusCode.ImageRecognizeFail]: '图像识别失败',
};

// 通用 API 响应结构
export interface ApiResponse<T = unknown> {
  status_code: StatusCode;
  status_msg?: string;
  data?: T;
}

// JWT Payload
export interface JwtPayload {
  id: number;
  username: string;
}

// 用户相关
export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserRegisterRequest {
  email: string;
  password: string;
}

export interface UserLoginResponse {
  token: string;
  username: string;
}

// 会话相关
export interface SessionInfo {
  sessionId: string;
  name: string;
}

export interface ChatSendRequest {
  sessionId: string;
  message: string;
  modelType?: string; // "1"=OpenAI, "2"=RAG, "3"=MCP, "4"=Ollama
}

export interface ChatNewSessionRequest {
  message: string;
  modelType?: string;
}

export interface ChatHistoryRequest {
  sessionId: string;
}

export interface ChatMessage {
  is_user: boolean;
  content: string;
}

// AI 模型相关
export type ModelType = '1' | '2' | '3' | '4';

export interface AIModelConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

// Schema Message (用于 AI 模型)
export interface SchemaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 缓存类型
export enum CacheType {
  Redis = 'redis',
  Memory = 'memory',
}

// 消息队列消息
export interface QueueMessage {
  id?: number;
  sessionId: string;
  userName: string;
  content: string;
  isUser: boolean;
  createdAt?: Date;
}

// 文件上传
export interface FileUploadResponse {
  filename: string;
  message: string;
}

// 图像识别
export interface ImageRecognizeResponse {
  label: string;
  confidence?: number;
}

// 配置类型
export interface AppConfig {
  server: {
    host: string;
    port: number;
    appName: string;
  };
  database: {
    url: string;
  };
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password: string;
    db: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
    subject: string;
  };
  rag: {
    embeddingModel: string;
    chatModel: string;
    docDir: string;
    baseUrl: string;
    dimension: number;
  };
  openai: {
    apiKey: string;
    baseUrl: string;
  };
  image: {
    enabled: boolean;
    onnxRuntimeLib: string;
    modelPath: string;
    labelPath: string;
  };
}

// Fastify 扩展
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

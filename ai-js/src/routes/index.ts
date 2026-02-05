import type { FastifyInstance } from 'fastify';
import { userController } from '../controllers/user.controller.js';
import { sessionController } from '../controllers/session.controller.js';
import { fileController } from '../controllers/file.controller.js';

/**
 * 注册所有路由
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // 用户认证路由 - /api/v1/user
  app.register(userController, { prefix: '/api/v1/user' });

  // AI 聊天路由 - /api/v1/AI/chat
  app.register(sessionController, { prefix: '/api/v1/AI/chat' });

  // 文件上传路由 - /api/v1/file
  app.register(fileController, { prefix: '/api/v1/file' });

  // 健康检查
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}

export default registerRoutes;

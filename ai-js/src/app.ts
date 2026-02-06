import Fastify, { type FastifyInstance } from "fastify";
import { getConfig } from "./config/index.js";
import { registerAuthPlugin } from "./middleware/auth.middleware.js";
import { registerRoutes } from "./routes/index.js";
import { logger } from "./utils/logger.js";

/**
 * 创建 Fastify 应用实例
 */
export async function createApp(): Promise<FastifyInstance> {
  const config = getConfig();

  // 创建 Fastify 实例
  const app = Fastify({
    logger: false, // 使用自定义 logger
    trustProxy: true,
  });

  // 注册 CORS
  await app.register(import("@fastify/cors"), {
    origin: true,
    credentials: true,
  });

  // 注册 Helmet（安全头）
  await app.register(import("@fastify/helmet"), {
    contentSecurityPolicy: false,
  });

  // 注册 JWT 认证
  await registerAuthPlugin(app);

  // 注册路由
  await registerRoutes(app);

  // 全局错误处理
  app.setErrorHandler((error, request, reply) => {
    logger.error("Unhandled error:", error);

    reply.status(error.statusCode || 500).send({
      code: 4001,
      message: error.message || "服务器内部错误",
    });
  });

  // 404 处理
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      code: 4004,
      message: "接口不存在",
    });
  });

  logger.info(`App created: ${config.server.appName}`);

  return app;
}

export default createApp;

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { StatusCode, StatusMessage } from '../types/index.js';

/**
 * 注册 JWT 认证插件和钩子
 */
export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  // 注册 JWT 插件
  const config = (await import('../config/index.js')).getConfig();
  
  await app.register(fastifyJwt, {
    secret: config.jwt.secret,
  });

  // 添加认证装饰器
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // 从 header 或 query 获取 token
      let token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        token = (request.query as { token?: string }).token;
      }

      if (!token) {
        return reply.status(401).send({
          status_code: StatusCode.InvalidToken,
          status_msg: StatusMessage[StatusCode.InvalidToken],
        });
      }

      // 验证 token
      const decoded = app.jwt.verify(token);
      request.user = decoded as { id: number; username: string };
    } catch (err) {
      return reply.status(401).send({
        status_code: StatusCode.InvalidToken,
        status_msg: StatusMessage[StatusCode.InvalidToken],
      });
    }
  });
}

/**
 * JWT 认证 preHandler 钩子
 */
export async function authPreHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // 从 header 或 query 获取 token
    let token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      token = (request.query as { token?: string }).token;
    }

    if (!token) {
      return reply.status(401).send({
        status_code: StatusCode.InvalidToken,
        status_msg: StatusMessage[StatusCode.InvalidToken],
      });
    }

    // 验证 token
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      status_code: StatusCode.InvalidToken,
      status_msg: StatusMessage[StatusCode.InvalidToken],
    });
  }
}

// 扩展 Fastify 类型
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

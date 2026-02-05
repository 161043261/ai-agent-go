import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSessionService } from '../services/session.service.js';
import { StatusCode, StatusMessage, type ModelType } from '../types/index.js';
import type {
  ChatSendRequest,
  ChatNewSessionRequest,
  ChatHistoryRequest,
} from '../types/index.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

/**
 * 会话控制器 - AI 聊天相关 API
 */
export async function sessionController(app: FastifyInstance): Promise<void> {
  const sessionService = getSessionService();

  // 获取用户所有会话
  app.get(
    '/sessions',
    { preHandler: authPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userName = request.user!.username;
      const sessions = await sessionService.getUserSessions(userName);

      return reply.send({
        status_code: StatusCode.Success,
        status_msg: StatusMessage[StatusCode.Success],
        sessions,
      });
    }
  );

  // 创建新会话并发送消息（同步）
  app.post<{ Body: ChatNewSessionRequest }>(
    '/send-new-session',
    {
      preHandler: authPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 1 },
            modelType: { type: 'string', enum: ['1', '2', '3', '4'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatNewSessionRequest }>, reply: FastifyReply) => {
      const userName = request.user!.username;
      const { message, modelType = '1' } = request.body;

      const result = await sessionService.createSessionAndSendMessage(
        userName,
        message,
        modelType as ModelType
      );

      if (!result.success) {
        return reply.send({
          status_code: result.code,
          status_msg: StatusMessage[result.code],
        });
      }

      return reply.send({
        status_code: StatusCode.Success,
        status_msg: StatusMessage[StatusCode.Success],
        ...(result.data as object),
      });
    }
  );

  // 向已有会话发送消息（同步）
  app.post<{ Body: ChatSendRequest }>(
    '/send',
    {
      preHandler: authPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['sessionId', 'message'],
          properties: {
            sessionId: { type: 'string', minLength: 1 },
            message: { type: 'string', minLength: 1 },
            modelType: { type: 'string', enum: ['1', '2', '3', '4'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatSendRequest }>, reply: FastifyReply) => {
      const userName = request.user!.username;
      const { sessionId, message, modelType = '1' } = request.body;

      const result = await sessionService.sendMessage(
        userName,
        sessionId,
        message,
        modelType as ModelType
      );

      if (!result.success) {
        return reply.send({
          status_code: result.code,
          status_msg: StatusMessage[result.code],
        });
      }

      return reply.send({
        status_code: StatusCode.Success,
        status_msg: StatusMessage[StatusCode.Success],
        ...(result.data as object),
      });
    }
  );

  // 创建新会话并流式发送消息（SSE）
  app.post<{ Body: ChatNewSessionRequest }>(
    '/send-stream-new-session',
    {
      preHandler: authPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 1 },
            modelType: { type: 'string', enum: ['1', '2', '3', '4'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatNewSessionRequest }>, reply: FastifyReply) => {
      const userName = request.user!.username;
      const { message, modelType = '1' } = request.body;

      // 设置 SSE 响应头
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        const result = await sessionService.createSessionAndStreamMessage(
          userName,
          message,
          modelType as ModelType,
          (chunk) => {
            reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }
        );

        if (result) {
          // 发送会话 ID
          reply.raw.write(`data: ${JSON.stringify({ sessionId: result.sessionId, done: true })}\n\n`);
        } else {
          reply.raw.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
        }
      } catch (error) {
        reply.raw.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
      }

      reply.raw.end();
    }
  );

  // 向已有会话流式发送消息（SSE）
  app.post<{ Body: ChatSendRequest }>(
    '/send-stream',
    {
      preHandler: authPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['sessionId', 'message'],
          properties: {
            sessionId: { type: 'string', minLength: 1 },
            message: { type: 'string', minLength: 1 },
            modelType: { type: 'string', enum: ['1', '2', '3', '4'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatSendRequest }>, reply: FastifyReply) => {
      const userName = request.user!.username;
      const { sessionId, message, modelType = '1' } = request.body;

      // 设置 SSE 响应头
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        const response = await sessionService.streamMessage(
          userName,
          sessionId,
          message,
          modelType as ModelType,
          (chunk) => {
            reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }
        );

        if (response !== null) {
          reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        } else {
          reply.raw.write(`data: ${JSON.stringify({ error: 'Session not found or access denied' })}\n\n`);
        }
      } catch (error) {
        reply.raw.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
      }

      reply.raw.end();
    }
  );

  // 获取聊天历史
  app.post<{ Body: ChatHistoryRequest }>(
    '/history',
    {
      preHandler: authPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatHistoryRequest }>, reply: FastifyReply) => {
      const userName = request.user!.username;
      const { sessionId } = request.body;

      const history = await sessionService.getChatHistory(userName, sessionId);

      return reply.send({
        status_code: StatusCode.Success,
        status_msg: StatusMessage[StatusCode.Success],
        history,
      });
    }
  );
}

export default sessionController;

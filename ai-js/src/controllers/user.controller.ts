import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUserService } from '../services/user.service.js';
import { StatusCode, StatusMessage } from '../types/index.js';
import type { UserLoginRequest, UserRegisterRequest } from '../types/index.js';

/**
 * 用户控制器
 */
export async function userController(app: FastifyInstance): Promise<void> {
  const userService = getUserService();

  // 用户登录
  app.post<{ Body: UserLoginRequest }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: UserLoginRequest }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      const result = await userService.login(email, password);

      if (!result.success) {
        return reply.send({
          status_code: result.code,
          status_msg: StatusMessage[result.code],
        });
      }

      // 生成 JWT Token
      const token = app.jwt.sign({
        id: result.userId,
        username: result.username,
      });

      return reply.send({
        status_code: StatusCode.Success,
        status_msg: StatusMessage[StatusCode.Success],
        token,
        username: result.username,
      });
    }
  );

  // 用户注册
  app.post<{ Body: UserRegisterRequest }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: UserRegisterRequest }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      const result = await userService.register(email, password);

      if (!result.success) {
        return reply.send({
          status_code: result.code,
          status_msg: StatusMessage[result.code],
        });
      }

      // 生成 JWT Token
      const token = app.jwt.sign({
        id: result.userId,
        username: result.username,
      });

      return reply.send({
        status_code: StatusCode.Success,
        status_msg: StatusMessage[StatusCode.Success],
        token,
        username: result.username,
      });
    }
  );
}

export default userController;

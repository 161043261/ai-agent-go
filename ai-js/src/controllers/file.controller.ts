import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getFileService } from '../services/file.service.js';
import { StatusCode, StatusMessage } from '../types/index.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

/**
 * 文件控制器 - RAG 文件上传
 */
export async function fileController(app: FastifyInstance): Promise<void> {
  const fileService = getFileService();

  // 注册 multipart 插件
  await app.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // 上传 RAG 文件
  app.post(
    '/upload',
    { preHandler: authPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userName = request.user!.username;

      try {
        const data = await request.file();
        
        if (!data) {
          return reply.send({
            status_code: StatusCode.InvalidParams,
            status_msg: '请选择要上传的文件',
          });
        }

        // 读取文件内容
        const buffer = await data.toBuffer();
        const filename = data.filename;

        const result = await fileService.uploadRagFile(userName, buffer, filename);

        if (!result.success) {
          return reply.send({
            status_code: result.code,
            status_msg: result.message || StatusMessage[result.code],
          });
        }

        return reply.send({
          status_code: StatusCode.Success,
          status_msg: StatusMessage[StatusCode.Success],
          filename: result.filename,
          message: result.message,
        });
      } catch (error) {
        return reply.send({
          status_code: StatusCode.FileUploadFail,
          status_msg: (error as Error).message,
        });
      }
    }
  );

  // 获取用户文件列表
  app.get(
    '/list',
    { preHandler: authPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userName = request.user!.username;
      const files = await fileService.getUserFiles(userName);

      return reply.send({
        status_code: StatusCode.Success,
        status_msg: StatusMessage[StatusCode.Success],
        files,
      });
    }
  );
}

export default fileController;

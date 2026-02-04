import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getImageService } from '../services/image.service.js';
import { StatusCode, StatusMessage } from '../types/index.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

/**
 * 图像控制器 - 图像识别
 */
export async function imageController(app: FastifyInstance): Promise<void> {
  const imageService = getImageService();

  // 注册 multipart 插件（如果还没有注册）
  if (!app.hasContentTypeParser('multipart')) {
    await app.register(import('@fastify/multipart'), {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    });
  }

  // 图像识别
  app.post(
    '/recognize',
    { preHandler: authPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.send({
            status_code: StatusCode.InvalidParams,
            status_msg: '请选择要识别的图片',
          });
        }

        // 读取文件内容
        const buffer = await data.toBuffer();

        const result = await imageService.recognizeImage(buffer);

        if (!result.success) {
          return reply.send({
            status_code: result.code,
            status_msg: result.message || StatusMessage[result.code],
          });
        }

        return reply.send({
          status_code: StatusCode.Success,
          status_msg: StatusMessage[StatusCode.Success],
          label: result.label,
        });
      } catch (error) {
        return reply.send({
          status_code: StatusCode.ImageRecognizeFail,
          status_msg: (error as Error).message,
        });
      }
    }
  );
}

export default imageController;

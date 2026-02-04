import { getConfig } from '../config/index.js';
import { getImageRecognizer } from '../lib/image/ImageRecognizer.js';
import { StatusCode } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface ImageRecognizeResult {
  success: boolean;
  code: StatusCode;
  label?: string;
  message?: string;
}

/**
 * 图像服务
 */
export class ImageService {
  private config = getConfig();

  /**
   * 识别图像
   */
  async recognizeImage(buffer: Buffer): Promise<ImageRecognizeResult> {
    if (!this.config.image.enabled) {
      return {
        success: false,
        code: StatusCode.ImageRecognizeFail,
        message: '图像识别功能未启用',
      };
    }

    try {
      const recognizer = getImageRecognizer();
      const label = await recognizer.predictFromBuffer(buffer);

      return {
        success: true,
        code: StatusCode.Success,
        label,
      };
    } catch (error) {
      logger.error('Image recognition error:', error);
      return {
        success: false,
        code: StatusCode.ImageRecognizeFail,
        message: (error as Error).message,
      };
    }
  }
}

// 单例
let imageService: ImageService | null = null;

export function getImageService(): ImageService {
  if (!imageService) {
    imageService = new ImageService();
  }
  return imageService;
}

export default ImageService;

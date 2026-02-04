import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// ONNX Runtime 类型
let ort: typeof import('onnxruntime-node') | null = null;

/**
 * 图像识别器 - 使用 ONNX Runtime 进行图像分类
 */
export class ImageRecognizer {
  private session: Awaited<ReturnType<typeof import('onnxruntime-node').InferenceSession.create>> | null = null;
  private labels: string[] = [];
  private inputH = 224;
  private inputW = 224;
  private initialized = false;

  /**
   * 初始化识别器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const config = getConfig();
    
    if (!config.image.enabled) {
      throw new Error('Image recognition is disabled');
    }

    try {
      // 动态导入 ONNX Runtime
      if (!ort) {
        ort = await import('onnxruntime-node');
      }

      // 加载模型
      this.session = await ort.InferenceSession.create(config.image.modelPath);
      
      // 加载标签
      this.labels = await this.loadLabels(config.image.labelPath);
      
      this.initialized = true;
      logger.info('ImageRecognizer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ImageRecognizer:', error);
      throw error;
    }
  }

  /**
   * 加载标签文件
   */
  private async loadLabels(labelPath: string): Promise<string[]> {
    const content = await fs.readFile(labelPath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * 从 Buffer 预测
   */
  async predictFromBuffer(buffer: Buffer): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.session || !ort) {
      throw new Error('ImageRecognizer not initialized');
    }

    try {
      // 使用 sharp 处理图像
      const sharp = (await import('sharp')).default;
      
      // 调整图像大小并获取 RGB 数据
      const { data, info } = await sharp(buffer)
        .resize(this.inputW, this.inputH, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // 转换为 Float32Array (NCHW 格式)
      const inputData = new Float32Array(3 * this.inputH * this.inputW);
      
      for (let y = 0; y < this.inputH; y++) {
        for (let x = 0; x < this.inputW; x++) {
          const srcIdx = (y * this.inputW + x) * 3;
          const r = data[srcIdx] / 255.0;
          const g = data[srcIdx + 1] / 255.0;
          const b = data[srcIdx + 2] / 255.0;
          
          // NCHW format
          inputData[y * this.inputW + x] = r;
          inputData[this.inputH * this.inputW + y * this.inputW + x] = g;
          inputData[2 * this.inputH * this.inputW + y * this.inputW + x] = b;
        }
      }

      // 创建输入 Tensor
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, this.inputH, this.inputW]);

      // 运行推理
      const feeds: Record<string, typeof inputTensor> = { data: inputTensor };
      const results = await this.session.run(feeds);

      // 获取输出
      const outputName = this.session.outputNames[0];
      const output = results[outputName];
      const outputData = output.data as Float32Array;

      // 找到最大概率的类别
      let maxIdx = 0;
      let maxVal = outputData[0];
      
      for (let i = 1; i < outputData.length; i++) {
        if (outputData[i] > maxVal) {
          maxVal = outputData[i];
          maxIdx = i;
        }
      }

      // 返回标签
      if (maxIdx >= 0 && maxIdx < this.labels.length) {
        return this.labels[maxIdx];
      }
      
      return 'Unknown';
    } catch (error) {
      logger.error('Image prediction error:', error);
      throw error;
    }
  }

  /**
   * 从文件预测
   */
  async predictFromFile(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return this.predictFromBuffer(buffer);
  }

  /**
   * 关闭识别器
   */
  async close(): Promise<void> {
    if (this.session) {
      // ONNX Runtime Node.js 版本的 session 没有 release 方法
      // 只需将引用置空即可
      this.session = null;
    }
    this.initialized = false;
  }
}

// 单例
let imageRecognizer: ImageRecognizer | null = null;

export function getImageRecognizer(): ImageRecognizer {
  if (!imageRecognizer) {
    imageRecognizer = new ImageRecognizer();
  }
  return imageRecognizer;
}

export default ImageRecognizer;

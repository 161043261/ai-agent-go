import type { SchemaMessage } from '../../types/index.js';

/**
 * AI 模型接口 - 所有 AI 模型的基类
 */
export interface AIModel {
  /**
   * 获取模型类型标识
   */
  getModelType(): string;

  /**
   * 同步生成回复
   */
  generateResponse(messages: SchemaMessage[]): Promise<string>;

  /**
   * 流式生成回复
   * @param messages 消息历史
   * @param onChunk 每收到一个 chunk 时的回调
   * @returns 完整的回复内容
   */
  streamResponse(
    messages: SchemaMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string>;
}

/**
 * 模型创建函数类型
 */
export type ModelCreator = (config?: Record<string, unknown>) => AIModel;

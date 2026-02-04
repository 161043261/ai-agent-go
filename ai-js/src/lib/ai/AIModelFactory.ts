import type { AIModel, ModelCreator } from './AIModel.js';
import { OpenAIModel } from './models/OpenAIModel.js';
import { OllamaModel } from './models/OllamaModel.js';
import { RAGModel } from './models/RAGModel.js';
import { MCPModel } from './models/MCPModel.js';
import type { ModelType } from '../../types/index.js';

/**
 * AI 模型工厂
 * 
 * 模型类型:
 * - "1": OpenAI 兼容模型
 * - "2": RAG 增强模型（带向量检索）
 * - "3": MCP 工具调用模型
 * - "4": Ollama 本地模型
 */
export class AIModelFactory {
  private static instance: AIModelFactory | null = null;
  private creators: Map<ModelType, ModelCreator> = new Map();

  private constructor() {
    // 注册默认模型创建器
    this.registerModel('1', (config) => new OpenAIModel(config));
    this.registerModel('2', (config) => new RAGModel(config));
    this.registerModel('3', (config) => new MCPModel(config));
    this.registerModel('4', (config) => new OllamaModel(config));
  }

  static getInstance(): AIModelFactory {
    if (!AIModelFactory.instance) {
      AIModelFactory.instance = new AIModelFactory();
    }
    return AIModelFactory.instance;
  }

  /**
   * 注册模型创建器
   */
  registerModel(type: ModelType, creator: ModelCreator): void {
    this.creators.set(type, creator);
  }

  /**
   * 创建模型实例
   */
  createModel(type: ModelType, config?: Record<string, unknown>): AIModel {
    const creator = this.creators.get(type);
    
    if (!creator) {
      // 默认使用 OpenAI 模型
      return new OpenAIModel(config);
    }
    
    return creator(config);
  }

  /**
   * 获取所有已注册的模型类型
   */
  getRegisteredTypes(): ModelType[] {
    return Array.from(this.creators.keys());
  }
}

// 便捷函数
export function getAIModelFactory(): AIModelFactory {
  return AIModelFactory.getInstance();
}

export default AIModelFactory;

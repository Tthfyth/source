/**
 * SDK 处理器基类
 */

import { ChatMessage, ModelConfig } from '../types';

export interface HandlerOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  modelConfig: ModelConfig;
  temperature?: number;
  maxTokens?: number;
}

export interface HandlerResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export abstract class BaseHandler {
  protected apiKey: string;
  protected baseUrl: string;
  protected model: string;
  protected modelConfig: ModelConfig;
  protected temperature: number;
  protected maxTokens: number;

  constructor(options: HandlerOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.model = options.model;
    this.modelConfig = options.modelConfig;
    this.temperature = options.temperature ?? 0.7;
    this.maxTokens = options.maxTokens ?? 4096;
  }

  /**
   * 发送聊天请求
   */
  abstract chat(messages: ChatMessage[]): Promise<HandlerResponse>;

  /**
   * 构建请求头
   */
  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 添加自定义请求头
    if (this.modelConfig.customHeader) {
      Object.assign(headers, this.modelConfig.customHeader);
    }

    return headers;
  }
}

/**
 * OpenAI SDK 兼容处理器
 * 支持 OpenAI、DeepSeek、通义千问、智谱、硅基流动等
 */

import OpenAI from 'openai';
import { ChatMessage } from '../types';
import { BaseHandler, HandlerOptions, HandlerResponse } from './base-handler';

export class OpenAIHandler extends BaseHandler {
  private client: OpenAI;

  constructor(options: HandlerOptions) {
    super(options);
    
    // 创建 OpenAI 客户端
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      defaultHeaders: this.modelConfig.customHeader,
    });
  }

  async chat(messages: ChatMessage[]): Promise<HandlerResponse> {
    const modelId = this.modelConfig.model || this.model;
    
    console.log(`[OpenAI Handler] 请求模型: ${modelId}, baseURL: ${this.baseUrl}`);

    const params: OpenAI.ChatCompletionCreateParams = {
      model: modelId,
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    };

    // 合并额外参数
    if (this.modelConfig.extraBody) {
      Object.assign(params, this.modelConfig.extraBody);
    }

    try {
      const completion = await this.client.chat.completions.create(params);
      
      const content = completion.choices?.[0]?.message?.content || '';
      const usage = completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      } : undefined;

      return { content, usage };
    } catch (error: any) {
      console.error(`[OpenAI Handler] 请求失败:`, error);
      throw new Error(error.message || 'OpenAI API 请求失败');
    }
  }
}

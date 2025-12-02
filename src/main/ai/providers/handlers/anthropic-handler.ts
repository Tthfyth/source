/**
 * Anthropic SDK 兼容处理器
 * 支持 Claude、DeepSeek Anthropic 模式、Kimi Coding、智谱 Anthropic 模式等
 */

import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage } from '../types';
import { BaseHandler, HandlerOptions, HandlerResponse } from './base-handler';

export class AnthropicHandler extends BaseHandler {
  private client: Anthropic;

  constructor(options: HandlerOptions) {
    super(options);
    
    // 创建 Anthropic 客户端
    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      defaultHeaders: this.modelConfig.customHeader,
    });
  }

  async chat(messages: ChatMessage[]): Promise<HandlerResponse> {
    const modelId = this.modelConfig.model || this.model;
    
    console.log(`[Anthropic Handler] 请求模型: ${modelId}, baseURL: ${this.baseUrl}`);

    // 分离系统消息和对话消息
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages: Anthropic.MessageParam[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // 确保消息以 user 开头
    if (chatMessages.length > 0 && chatMessages[0].role !== 'user') {
      chatMessages.unshift({
        role: 'user',
        content: '请继续',
      });
    }

    const params: Anthropic.MessageCreateParams = {
      model: modelId,
      messages: chatMessages,
      max_tokens: this.maxTokens,
    };

    // 添加系统消息
    if (systemMessage) {
      params.system = systemMessage.content;
    }

    // 合并额外参数
    if (this.modelConfig.extraBody) {
      Object.assign(params, this.modelConfig.extraBody);
    }

    try {
      const response = await this.client.messages.create(params);
      
      // Anthropic 响应格式
      let content = '';
      if (response.content && Array.isArray(response.content)) {
        content = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('');
      }

      const usage = response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      } : undefined;

      return { content, usage };
    } catch (error: any) {
      console.error(`[Anthropic Handler] 请求失败:`, error);
      throw new Error(error.message || 'Anthropic API 请求失败');
    }
  }
}

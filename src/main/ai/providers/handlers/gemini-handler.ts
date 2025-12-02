/**
 * Google Gemini API 处理器
 */

import { ChatMessage } from '../types';
import { BaseHandler, HandlerOptions, HandlerResponse } from './base-handler';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export class GeminiHandler extends BaseHandler {
  constructor(options: HandlerOptions) {
    super(options);
  }

  async chat(messages: ChatMessage[]): Promise<HandlerResponse> {
    const modelId = this.modelConfig.model || this.model;
    const url = `${this.baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`;
    
    const headers = this.buildHeaders();

    // 分离系统消息和对话消息
    const systemMessage = messages.find(m => m.role === 'system');
    const contents: GeminiContent[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    };

    // 添加系统指令
    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    console.log(`[Gemini Handler] 请求模型: ${modelId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini Handler] 错误响应:`, errorText);
      throw new Error(`API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Gemini 响应格式
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const usage = data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount,
      completionTokens: data.usageMetadata.candidatesTokenCount,
      totalTokens: data.usageMetadata.totalTokenCount,
    } : undefined;

    return { content, usage };
  }
}

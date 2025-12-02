/**
 * SDK 处理器工厂
 */

import { ModelConfig } from '../types';
import { BaseHandler, HandlerOptions } from './base-handler';
import { OpenAIHandler } from './openai-handler';
import { AnthropicHandler } from './anthropic-handler';
import { GeminiHandler } from './gemini-handler';

export type SdkMode = 'openai' | 'anthropic' | 'gemini';

/**
 * 创建 SDK 处理器
 */
export function createHandler(
  sdkMode: SdkMode,
  options: HandlerOptions
): BaseHandler {
  switch (sdkMode) {
    case 'anthropic':
      return new AnthropicHandler(options);
    case 'gemini':
      return new GeminiHandler(options);
    case 'openai':
    default:
      return new OpenAIHandler(options);
  }
}

/**
 * 根据模型配置确定 SDK 模式
 */
export function getSdkMode(
  modelConfig: ModelConfig,
  providerSdkMode?: SdkMode
): SdkMode {
  // 模型级别的 sdkMode 优先
  if (modelConfig.sdkMode) {
    return modelConfig.sdkMode;
  }
  // 供应商级别的 sdkMode
  if (providerSdkMode) {
    return providerSdkMode;
  }
  // 默认使用 OpenAI
  return 'openai';
}

export { BaseHandler, HandlerOptions, HandlerResponse } from './base-handler';
export { OpenAIHandler } from './openai-handler';
export { AnthropicHandler } from './anthropic-handler';
export { GeminiHandler } from './gemini-handler';

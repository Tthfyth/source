/**
 * AI 供应商类型定义
 */

// 模型配置
export interface ModelConfig {
  id: string;
  name: string;
  tooltip?: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  // 实际请求时使用的模型名称（如果与 id 不同）
  model?: string;
  // SDK 模式: openai | anthropic | gemini
  sdkMode?: 'openai' | 'anthropic' | 'gemini';
  // 模型特定的 baseUrl（覆盖供应商默认值）
  baseUrl?: string;
  // 额外请求参数
  extraBody?: Record<string, any>;
  // 自定义请求头
  customHeader?: Record<string, string>;
  // 模型能力
  capabilities?: {
    toolCalling?: boolean;
    imageInput?: boolean;
  };
}

// 供应商配置
export interface ProviderConfig {
  id: string;
  displayName: string;
  baseUrl: string;
  apiKeyTemplate?: string;
  apiKeyUrl?: string;
  // 默认 SDK 模式
  sdkMode?: 'openai' | 'anthropic' | 'gemini';
  models: ModelConfig[];
  // 免费额度限制
  dailyLimit?: number;
  monthlyLimit?: number;
  // 是否启用
  enabled?: boolean;
  // 优先级（数字越小优先级越高）
  priority?: number;
}

// 用户配置（存储 API Key 等）
export interface UserProviderConfig {
  id: string;
  enabled: boolean;
  apiKey?: string;
  selectedModel?: string;
}

// 聊天消息
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// AI 响应
export interface AIResponse {
  success: boolean;
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// 使用记录
export interface UsageRecord {
  date: string;
  count: number;
  tokens?: number;
}

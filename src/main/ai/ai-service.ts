/**
 * AI 服务
 * 基于插件式供应商架构，支持多供应商、多模型
 */

import { getKnowledgeInjector } from './rule-knowledge-injector';
import {
  getAIProviderService,
  AIProviderService,
  ChatMessage,
  AIResponse,
  ProviderConfig,
  UserProviderConfig,
} from './providers';

// 兼容旧接口
export interface AIProvider {
  id: string;
  name: string;
  priority: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  availableModels?: string[];
}

class AIService {
  private providerService: AIProviderService;

  constructor() {
    this.providerService = getAIProviderService();
  }

  /**
   * 发送聊天消息
   */
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    return this.providerService.chatWithFallback(messages);
  }

  /**
   * 带知识库的聊天（用于书源规则生成）
   */
  async chatWithKnowledge(
    userMessage: string,
    pageContent?: {
      url: string;
      title: string;
      selectors: Record<string, string>;
      structure: Record<string, string>;
      features: any;
      samples: any;
    },
    chatHistory?: Array<{ role: string; content: string }>
  ): Promise<AIResponse> {
    const injector = getKnowledgeInjector();
    const rawMessages = injector.buildFullContext(userMessage, pageContent, chatHistory);
    const messages: ChatMessage[] = rawMessages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }));
    return this.chat(messages);
  }

  /**
   * 分步教学式规则生成（适用于复杂网站）
   */
  async generateRuleStepByStep(pageContent: {
    url: string;
    title: string;
    html?: string;
    sections?: Array<{ name: string; selector: string; html: string }>;
    pageType?: 'search' | 'detail' | 'toc' | 'content' | 'unknown';
  }): Promise<AIResponse> {
    const injector = getKnowledgeInjector();
    const messages = injector.buildStepByStepPrompts(pageContent);
    console.log('[AI] 使用分步教学模式，共 ' + messages.length + ' 条消息');
    return this.chat(messages as ChatMessage[]);
  }

  /**
   * 获取供应商列表（兼容旧接口）
   */
  getProviders(): AIProvider[] {
    const providers = this.providerService.getProviders();
    return providers.map(p => ({
      id: p.id,
      name: p.displayName,
      priority: p.priority || 99,
      dailyLimit: p.dailyLimit,
      monthlyLimit: p.monthlyLimit,
      enabled: p.userConfig.enabled,
      apiKey: p.userConfig.apiKey,
      baseUrl: p.baseUrl,
      model: p.userConfig.selectedModel || p.models[0]?.id,
      availableModels: p.models.map(m => m.id),
    }));
  }

  /**
   * 获取完整供应商配置（新接口）
   */
  getProvidersV2(): Array<ProviderConfig & { userConfig: UserProviderConfig }> {
    return this.providerService.getProviders();
  }

  /**
   * 更新供应商配置（兼容旧接口）
   */
  updateProvider(id: string, config: Partial<AIProvider>): void {
    this.providerService.updateProvider(id, {
      enabled: config.enabled,
      apiKey: config.apiKey,
      selectedModel: config.model,
    });
  }

  /**
   * 更新供应商配置（新接口）
   */
  updateProviderV2(id: string, config: Partial<UserProviderConfig>): void {
    this.providerService.updateProvider(id, config);
  }

  /**
   * 设置当前活动的供应商和模型
   */
  setActiveProvider(providerId: string, modelId?: string): void {
    this.providerService.setActiveProvider(providerId, modelId);
  }

  /**
   * 获取当前活动的供应商和模型
   */
  getActiveProvider(): { providerId?: string; modelId?: string } {
    return this.providerService.getActiveProvider();
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    return this.providerService.getUsageStats();
  }

  /**
   * 指定供应商和模型发送请求
   */
  async chatWithProvider(
    messages: ChatMessage[],
    providerId: string,
    modelId?: string
  ): Promise<AIResponse> {
    return this.providerService.chat(messages, { providerId, modelId });
  }
}

// 单例
let aiService: AIService | null = null;

export function getAIService(): AIService {
  if (!aiService) {
    aiService = new AIService();
  }
  return aiService;
}

// 重新导出类型
export type { ChatMessage, AIResponse } from './providers';

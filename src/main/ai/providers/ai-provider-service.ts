/**
 * AI 供应商服务
 * 插件式架构，支持多供应商、多模型
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  ProviderConfig,
  UserProviderConfig,
  ModelConfig,
  ChatMessage,
  AIResponse,
  UsageRecord,
} from './types';
import { providerConfigs, getProviderConfig } from './configs';
import { createHandler, getSdkMode, SdkMode } from './handlers';

// 用户配置文件结构
interface UserConfig {
  providers: UserProviderConfig[];
  activeProviderId?: string;
  activeModelId?: string;
}

// 使用统计
interface UsageStats {
  [key: string]: UsageRecord;
}

export class AIProviderService {
  private userConfig: UserConfig;
  private usage: UsageStats;
  private configPath: string;
  private usagePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'ai-providers-config.json');
    this.usagePath = path.join(userDataPath, 'ai-providers-usage.json');
    
    this.userConfig = { providers: [] };
    this.usage = {};
    
    this.loadConfig();
    this.loadUsage();
  }

  /**
   * 加载用户配置
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        this.userConfig = data;
      }
    } catch (error) {
      console.error('[AIProviderService] 加载配置失败:', error);
    }

    // 确保所有供应商都有用户配置
    for (const provider of providerConfigs) {
      if (!this.userConfig.providers.find(p => p.id === provider.id)) {
        this.userConfig.providers.push({
          id: provider.id,
          enabled: false,
        });
      }
    }
  }

  /**
   * 保存用户配置
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.userConfig, null, 2));
    } catch (error) {
      console.error('[AIProviderService] 保存配置失败:', error);
    }
  }

  /**
   * 加载使用记录
   */
  private loadUsage(): void {
    try {
      if (fs.existsSync(this.usagePath)) {
        this.usage = JSON.parse(fs.readFileSync(this.usagePath, 'utf-8'));
      }
    } catch (error) {
      console.error('[AIProviderService] 加载使用记录失败:', error);
    }
  }

  /**
   * 保存使用记录
   */
  private saveUsage(): void {
    try {
      fs.writeFileSync(this.usagePath, JSON.stringify(this.usage, null, 2));
    } catch (error) {
      console.error('[AIProviderService] 保存使用记录失败:', error);
    }
  }

  /**
   * 获取所有供应商配置（包含用户配置）
   */
  getProviders(): Array<ProviderConfig & { userConfig: UserProviderConfig }> {
    return providerConfigs.map(provider => {
      const userConfig = this.userConfig.providers.find(p => p.id === provider.id) || {
        id: provider.id,
        enabled: false,
      };
      return {
        ...provider,
        userConfig: {
          ...userConfig,
          // 隐藏 API Key
          apiKey: userConfig.apiKey ? '******' : undefined,
        },
      };
    });
  }

  /**
   * 获取供应商详情（包含完整 API Key，仅内部使用）
   */
  private getProviderWithKey(providerId: string): {
    config: ProviderConfig;
    userConfig: UserProviderConfig;
  } | null {
    const config = getProviderConfig(providerId);
    if (!config) return null;

    const userConfig = this.userConfig.providers.find(p => p.id === providerId);
    if (!userConfig) return null;

    return { config, userConfig };
  }

  /**
   * 更新供应商配置
   */
  updateProvider(providerId: string, updates: Partial<UserProviderConfig>): void {
    const index = this.userConfig.providers.findIndex(p => p.id === providerId);
    if (index !== -1) {
      this.userConfig.providers[index] = {
        ...this.userConfig.providers[index],
        ...updates,
      };
    } else {
      this.userConfig.providers.push({
        id: providerId,
        enabled: false,
        ...updates,
      });
    }
    this.saveConfig();
  }

  /**
   * 设置当前活动的供应商和模型
   */
  setActiveProvider(providerId: string, modelId?: string): void {
    this.userConfig.activeProviderId = providerId;
    if (modelId) {
      this.userConfig.activeModelId = modelId;
    }
    this.saveConfig();
  }

  /**
   * 获取当前活动的供应商和模型
   */
  getActiveProvider(): { providerId?: string; modelId?: string } {
    return {
      providerId: this.userConfig.activeProviderId,
      modelId: this.userConfig.activeModelId,
    };
  }

  /**
   * 检查供应商是否有配额
   */
  private hasQuota(provider: ProviderConfig): boolean {
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);

    if (provider.dailyLimit) {
      const key = `${provider.id}:daily:${today}`;
      const record = this.usage[key];
      if (record && record.count >= provider.dailyLimit) {
        return false;
      }
    }

    if (provider.monthlyLimit) {
      const key = `${provider.id}:monthly:${month}`;
      const record = this.usage[key];
      if (record && record.count >= provider.monthlyLimit) {
        return false;
      }
    }

    return true;
  }

  /**
   * 记录使用量
   */
  private recordUsage(provider: ProviderConfig, tokens?: number): void {
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);

    if (provider.dailyLimit) {
      const key = `${provider.id}:daily:${today}`;
      const record = this.usage[key] || { date: today, count: 0 };
      record.count++;
      if (tokens) record.tokens = (record.tokens || 0) + tokens;
      this.usage[key] = record;
    }

    if (provider.monthlyLimit) {
      const key = `${provider.id}:monthly:${month}`;
      const record = this.usage[key] || { date: month, count: 0 };
      record.count++;
      if (tokens) record.tokens = (record.tokens || 0) + tokens;
      this.usage[key] = record;
    }

    this.saveUsage();
  }

  /**
   * 获取使用统计
   */
  getUsageStats(): Record<string, {
    daily: number;
    monthly: number;
    dailyTokens?: number;
    monthlyTokens?: number;
    limit: { daily?: number; monthly?: number };
  }> {
    const stats: Record<string, any> = {};
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);

    for (const provider of providerConfigs) {
      const dailyKey = `${provider.id}:daily:${today}`;
      const monthlyKey = `${provider.id}:monthly:${month}`;

      stats[provider.id] = {
        daily: this.usage[dailyKey]?.count || 0,
        monthly: this.usage[monthlyKey]?.count || 0,
        dailyTokens: this.usage[dailyKey]?.tokens,
        monthlyTokens: this.usage[monthlyKey]?.tokens,
        limit: {
          daily: provider.dailyLimit,
          monthly: provider.monthlyLimit,
        },
      };
    }

    return stats;
  }

  /**
   * 发送聊天请求
   */
  async chat(messages: ChatMessage[], options?: {
    providerId?: string;
    modelId?: string;
  }): Promise<AIResponse> {
    // 确定使用的供应商和模型
    let providerId = options?.providerId || this.userConfig.activeProviderId;
    let modelId = options?.modelId || this.userConfig.activeModelId;

    // 如果没有指定，尝试找到第一个可用的供应商
    if (!providerId) {
      const availableProvider = this.findAvailableProvider();
      if (availableProvider) {
        providerId = availableProvider.config.id;
        modelId = availableProvider.modelId;
      }
    }

    if (!providerId) {
      return {
        success: false,
        error: '没有可用的 AI 供应商，请在设置中配置 API Key',
      };
    }

    const providerData = this.getProviderWithKey(providerId);
    if (!providerData) {
      return {
        success: false,
        error: `未找到供应商: ${providerId}`,
      };
    }

    const { config, userConfig } = providerData;

    if (!userConfig.apiKey) {
      return {
        success: false,
        error: `${config.displayName} 未配置 API Key`,
      };
    }

    if (!this.hasQuota(config)) {
      return {
        success: false,
        error: `${config.displayName} 配额已用完`,
      };
    }

    // 确定模型
    modelId = modelId || userConfig.selectedModel || config.models[0]?.id;
    const modelConfig = config.models.find(m => m.id === modelId);
    if (!modelConfig) {
      return {
        success: false,
        error: `未找到模型: ${modelId}`,
      };
    }

    try {
      console.log(`[AIProviderService] 使用 ${config.displayName} / ${modelConfig.name}`);

      // 确定 SDK 模式和 baseUrl
      const sdkMode = getSdkMode(modelConfig, config.sdkMode as SdkMode);
      const baseUrl = modelConfig.baseUrl || config.baseUrl;

      // 创建处理器
      const handler = createHandler(sdkMode, {
        apiKey: userConfig.apiKey,
        baseUrl,
        model: modelId,
        modelConfig,
        maxTokens: Math.min(4096, modelConfig.maxOutputTokens),
      });

      // 发送请求
      const result = await handler.chat(messages);

      // 记录使用量
      this.recordUsage(config, result.usage?.totalTokens);

      return {
        success: true,
        content: result.content,
        provider: config.displayName,
        model: modelConfig.name,
        usage: result.usage,
      };
    } catch (error: any) {
      console.error(`[AIProviderService] ${config.displayName} 调用失败:`, error);
      return {
        success: false,
        error: error.message || '请求失败',
        provider: config.displayName,
        model: modelConfig.name,
      };
    }
  }

  /**
   * 查找可用的供应商
   */
  private findAvailableProvider(): {
    config: ProviderConfig;
    userConfig: UserProviderConfig;
    modelId: string;
  } | null {
    // 按优先级排序
    const sortedProviders = [...providerConfigs].sort(
      (a, b) => (a.priority || 99) - (b.priority || 99)
    );

    for (const config of sortedProviders) {
      const userConfig = this.userConfig.providers.find(p => p.id === config.id);
      if (userConfig?.enabled && userConfig.apiKey && this.hasQuota(config)) {
        const modelId = userConfig.selectedModel || config.models[0]?.id;
        if (modelId) {
          return { config, userConfig, modelId };
        }
      }
    }

    return null;
  }

  /**
   * 自动切换到下一个可用供应商
   */
  async chatWithFallback(messages: ChatMessage[]): Promise<AIResponse> {
    // 按优先级排序
    const sortedProviders = [...providerConfigs].sort(
      (a, b) => (a.priority || 99) - (b.priority || 99)
    );

    for (const config of sortedProviders) {
      const userConfig = this.userConfig.providers.find(p => p.id === config.id);
      if (!userConfig?.enabled || !userConfig.apiKey) continue;
      if (!this.hasQuota(config)) {
        console.log(`[AIProviderService] ${config.displayName} 配额已用完，尝试下一个`);
        continue;
      }

      const modelId = userConfig.selectedModel || config.models[0]?.id;
      const result = await this.chat(messages, {
        providerId: config.id,
        modelId,
      });

      if (result.success) {
        return result;
      }

      console.warn(`[AIProviderService] ${config.displayName} 调用失败，尝试下一个`);
    }

    return {
      success: false,
      error: '所有 AI 供应商都不可用或配额已耗尽',
    };
  }
}

// 单例
let aiProviderService: AIProviderService | null = null;

export function getAIProviderService(): AIProviderService {
  if (!aiProviderService) {
    aiProviderService = new AIProviderService();
  }
  return aiProviderService;
}

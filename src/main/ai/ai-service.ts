/**
 * 零成本 AI 服务
 * 支持多个 AI 供应商，自动切换和配额管理
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getKnowledgeInjector } from './rule-knowledge-injector';
// 本地模型 - 使用 Transformers.js
import { getLocalAIService } from './local-ai-service';

// AI 供应商配置
interface AIProvider {
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

// AI 供应商管道配置
// 模型列表来源于各供应商官方文档，额度为免费层级限制
const AI_PIPELINE: AIProvider[] = [
  {
    id: 'github',
    name: 'GitHub Models',
    priority: 1,
    dailyLimit: 150, // GitHub Models 免费层每天约 150 次请求
    enabled: true,
    baseUrl: 'https://models.inference.ai.azure.com',
    model: 'gpt-4o-mini',
    // GitHub Models 真实可用模型 (2024年)
    // https://github.com/marketplace/models
    availableModels: [
      'gpt-4o-mini',           // OpenAI GPT-4o Mini
      'gpt-4o',                // OpenAI GPT-4o
      'o1-mini',               // OpenAI o1-mini
      'o1-preview',            // OpenAI o1-preview
      'Phi-3.5-mini-instruct', // Microsoft Phi-3.5
      'Phi-3.5-MoE-instruct',  // Microsoft Phi-3.5 MoE
      'AI21-Jamba-1.5-Mini',   // AI21 Jamba
      'Meta-Llama-3.1-8B-Instruct',   // Meta Llama 3.1 8B
      'Meta-Llama-3.1-70B-Instruct',  // Meta Llama 3.1 70B
      'Meta-Llama-3.1-405B-Instruct', // Meta Llama 3.1 405B
      'Mistral-small',         // Mistral Small
      'Mistral-large',         // Mistral Large
      'Mistral-Nemo',          // Mistral Nemo
      'Cohere-command-r',      // Cohere Command R
      'Cohere-command-r-plus', // Cohere Command R+
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    priority: 2,
    dailyLimit: 1500, // Gemini API 免费层每天 1500 次请求
    enabled: false,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-flash',
    // Google AI Studio 真实可用模型
    // https://ai.google.dev/models
    availableModels: [
      'gemini-1.5-flash',      // 快速响应，适合大多数任务
      'gemini-1.5-flash-8b',   // 更快速的小模型
      'gemini-1.5-pro',        // 更强大，适合复杂任务
      'gemini-1.0-pro',        // 旧版稳定模型
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    priority: 3,
    monthlyLimit: 5000000, // DeepSeek 免费额度 500万 tokens/月
    enabled: false,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    // DeepSeek 真实可用模型
    // https://platform.deepseek.com/docs
    availableModels: [
      'deepseek-chat',         // DeepSeek-V3 对话模型
      'deepseek-reasoner',     // DeepSeek-R1 推理模型
    ],
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    priority: 4,
    dailyLimit: 2000, // 硅基流动免费层每天约 2000 次
    enabled: false,
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    // 硅基流动免费模型
    // https://siliconflow.cn/models
    availableModels: [
      'Qwen/Qwen2.5-7B-Instruct',      // 通义千问 7B
      'Qwen/Qwen2.5-Coder-7B-Instruct', // 通义千问代码 7B
      'THUDM/glm-4-9b-chat',           // 智谱 GLM-4 9B
      'internlm/internlm2_5-7b-chat',  // 书生浦语 7B
      'deepseek-ai/DeepSeek-V2.5',     // DeepSeek V2.5
    ],
  },
  {
    id: 'local',
    name: 'Transformers.js (本地)',
    priority: 99, // 最低优先级，作为备用
    enabled: false,
    baseUrl: 'local',
    model: 'Xenova/LaMini-Flan-T5-248M',
    // Transformers.js 支持的本地模型
    // 参考: https://huggingface.co/models?library=transformers.js
    availableModels: [
      'Xenova/LaMini-Flan-T5-248M',    // 超轻量指令模型
      'Xenova/flan-t5-small',          // Google Flan-T5 小型版
      'Xenova/distilgpt2',             // 轻量级 GPT-2
      'Xenova/gpt2',                   // OpenAI GPT-2
      'HuggingFaceTB/SmolLM2-135M-Instruct', // 超小型指令模型
    ],
  },
];

// 消息类型
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// AI 响应
export interface AIResponse {
  success: boolean;
  content?: string;
  provider?: string;
  error?: string;
}

// 使用记录
interface UsageRecord {
  date: string;
  count: number;
}

class AIService {
  private providers: AIProvider[] = [];
  private usage: Map<string, UsageRecord> = new Map();
  private configPath: string;
  private usagePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'ai-config.json');
    this.usagePath = path.join(userDataPath, 'ai-usage.json');
    
    this.loadConfig();
    this.loadUsage();
  }

  /**
   * 加载配置
   */
  private loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        // 合并默认配置和用户配置
        this.providers = AI_PIPELINE.map(defaultProvider => {
          const userConfig = data.providers?.find((p: AIProvider) => p.id === defaultProvider.id);
          return { ...defaultProvider, ...userConfig };
        });
      } else {
        this.providers = [...AI_PIPELINE];
      }
    } catch (error) {
      console.error('加载 AI 配置失败:', error);
      this.providers = [...AI_PIPELINE];
    }
  }

  /**
   * 保存配置
   */
  private saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify({ providers: this.providers }, null, 2));
    } catch (error) {
      console.error('保存 AI 配置失败:', error);
    }
  }

  /**
   * 加载使用记录
   */
  private loadUsage() {
    try {
      if (fs.existsSync(this.usagePath)) {
        const data = JSON.parse(fs.readFileSync(this.usagePath, 'utf-8'));
        this.usage = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('加载使用记录失败:', error);
    }
  }

  /**
   * 保存使用记录
   */
  private saveUsage() {
    try {
      const data = Object.fromEntries(this.usage);
      fs.writeFileSync(this.usagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('保存使用记录失败:', error);
    }
  }

  /**
   * 检查供应商是否有配额
   */
  private hasQuota(provider: AIProvider): boolean {
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);
    
    if (provider.dailyLimit) {
      const key = `${provider.id}:daily:${today}`;
      const record = this.usage.get(key);
      if (record && record.count >= provider.dailyLimit) {
        return false;
      }
    }
    
    if (provider.monthlyLimit) {
      const key = `${provider.id}:monthly:${month}`;
      const record = this.usage.get(key);
      if (record && record.count >= provider.monthlyLimit) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 记录使用量
   */
  private recordUsage(provider: AIProvider) {
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);
    
    if (provider.dailyLimit) {
      const key = `${provider.id}:daily:${today}`;
      const record = this.usage.get(key) || { date: today, count: 0 };
      record.count++;
      this.usage.set(key, record);
    }
    
    if (provider.monthlyLimit) {
      const key = `${provider.id}:monthly:${month}`;
      const record = this.usage.get(key) || { date: month, count: 0 };
      record.count++;
      this.usage.set(key, record);
    }
    
    this.saveUsage();
  }

  /**
   * 调用本地模型 (Transformers.js)
   */
  private async callLocal(messages: ChatMessage[], model: string): Promise<string> {
    const localService = getLocalAIService();
    
    // 确保模型已加载
    const currentModel = localService.getCurrentModel();
    if (currentModel !== model) {
      console.log(`加载本地模型: ${model}`);
      await localService.loadModel(model);
    }
    
    const result = await localService.chat(messages);
    if (!result.success) {
      throw new Error(result.error || '本地模型调用失败');
    }
    
    return result.content || '';
  }

  /**
   * 调用 GitHub Models API
   */
  private async callGitHub(messages: ChatMessage[], apiKey: string, model: string): Promise<string> {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub Models API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * 调用 Gemini API
   */
  private async callGemini(messages: ChatMessage[], apiKey: string, model: string): Promise<string> {
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * 调用 OpenAI 兼容 API（DeepSeek、硅基流动等）
   */
  private async callOpenAICompatible(
    messages: ChatMessage[],
    apiKey: string,
    baseUrl: string,
    model: string
  ): Promise<string> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * 调用指定供应商
   */
  private async callProvider(provider: AIProvider, messages: ChatMessage[]): Promise<string> {
    // 本地模型不需要 API Key
    if (provider.id === 'local') {
      return this.callLocal(messages, provider.model || 'Xenova/Qwen1.5-0.5B-Chat');
    }

    if (!provider.apiKey) {
      throw new Error(`${provider.name} 未配置 API Key`);
    }

    switch (provider.id) {
      case 'github':
        return this.callGitHub(messages, provider.apiKey, provider.model || 'gpt-4o-mini');
      case 'gemini':
        return this.callGemini(messages, provider.apiKey, provider.model || 'gemini-1.5-flash');
      case 'deepseek':
      case 'siliconflow':
        return this.callOpenAICompatible(
          messages,
          provider.apiKey,
          provider.baseUrl || '',
          provider.model || ''
        );
      default:
        throw new Error(`未知的供应商: ${provider.id}`);
    }
  }

  /**
   * 发送聊天消息
   */
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    // 按优先级排序并过滤启用的供应商
    // 本地模型不需要 API Key，其他供应商需要
    const enabledProviders = this.providers
      .filter(p => p.enabled && (p.id === 'local' || p.apiKey))
      .sort((a, b) => a.priority - b.priority);

    if (enabledProviders.length === 0) {
      return {
        success: false,
        error: '没有可用的 AI 供应商，请在设置中配置 API Key 或启用本地模型',
      };
    }

    for (const provider of enabledProviders) {
      if (!this.hasQuota(provider)) {
        console.log(`${provider.name} 配额已用完，尝试下一个供应商`);
        continue;
      }

      try {
        console.log(`使用 ${provider.name} 处理请求...`);
        const content = await this.callProvider(provider, messages);
        this.recordUsage(provider);
        
        return {
          success: true,
          content,
          provider: provider.name,
        };
      } catch (error: any) {
        console.warn(`${provider.name} 调用失败:`, error.message);
      }
    }

    return {
      success: false,
      error: '所有 AI 供应商都不可用或配额已耗尽',
    };
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
    // 转换为 ChatMessage 类型
    const messages: ChatMessage[] = rawMessages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }));
    return this.chat(messages);
  }

  /**
   * 分步教学式规则生成（适用于复杂网站）
   * 使用多轮对话逐步引导 AI 分析和生成规则
   */
  async generateRuleStepByStep(pageContent: {
    url: string;
    title: string;
    html?: string;
    sections?: Array<{ name: string; selector: string; html: string }>;
    pageType?: 'search' | 'detail' | 'toc' | 'content' | 'unknown';
  }): Promise<AIResponse> {
    const injector = getKnowledgeInjector();
    
    // 构建分步教学式 Prompt
    const messages = injector.buildStepByStepPrompts(pageContent);
    
    console.log('[AI] 使用分步教学模式，共 ' + messages.length + ' 条消息');
    
    // 调用 AI
    return this.chat(messages as ChatMessage[]);
  }

  /**
   * 获取供应商列表
   */
  getProviders(): AIProvider[] {
    return this.providers.map(p => ({
      ...p,
      // 本地模型不需要 API Key，标记为已配置
      apiKey: p.id === 'local' ? 'local' : (p.apiKey ? '******' : undefined),
    }));
  }

  /**
   * 更新供应商配置
   */
  updateProvider(id: string, config: Partial<AIProvider>) {
    const index = this.providers.findIndex(p => p.id === id);
    if (index !== -1) {
      this.providers[index] = { ...this.providers[index], ...config };
      this.saveConfig();
    }
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    const stats: Record<string, { daily: number; monthly: number; limit: { daily?: number; monthly?: number } }> = {};
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7);

    for (const provider of this.providers) {
      const dailyKey = `${provider.id}:daily:${today}`;
      const monthlyKey = `${provider.id}:monthly:${month}`;
      
      stats[provider.id] = {
        daily: this.usage.get(dailyKey)?.count || 0,
        monthly: this.usage.get(monthlyKey)?.count || 0,
        limit: {
          daily: provider.dailyLimit,
          monthly: provider.monthlyLimit,
        },
      };
    }

    return stats;
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

export type { AIProvider };

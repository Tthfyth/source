/**
 * 本地 AI 服务 - 使用 Transformers.js
 * 无需 API Key，完全本地运行
 * 
 * 参考: https://huggingface.co/docs/transformers.js/installation
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Transformers.js 模块缓存
let pipeline: any = null;
let env: any = null;

// 模型缓存路径
let modelCachePath: string = '';

/**
 * 初始化 Transformers.js
 * 使用动态导入支持 ESM 模块
 */
async function initTransformers() {
  if (pipeline && env) return { pipeline, env };

  try {
    // 动态导入 transformers.js
    // 在 Electron main 进程中使用 Node.js 后端
    const transformers = await import('@huggingface/transformers');
    
    pipeline = transformers.pipeline;
    env = transformers.env;

    // 配置模型缓存路径
    const userDataPath = app?.getPath?.('userData') || '.';
    modelCachePath = path.join(userDataPath, 'models');
    
    // 确保缓存目录存在
    if (!fs.existsSync(modelCachePath)) {
      fs.mkdirSync(modelCachePath, { recursive: true });
    }

    // 配置 Transformers.js 环境
    // 参考: https://huggingface.co/docs/transformers.js/api/env
    env.cacheDir = modelCachePath;
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
    
    // 使用国内镜像源 (解决网络问题)
    // hf-mirror.com 是 Hugging Face 的国内镜像
    env.remoteHost = 'https://hf-mirror.com';
    
    // 禁用浏览器缓存 (Electron 中使用文件系统缓存)
    env.useBrowserCache = false;
    
    // 使用 fs 模块进行文件操作 (Node.js 环境)
    env.useFS = true;

    console.log('[Transformers.js] 初始化完成');
    console.log('[Transformers.js] 模型缓存路径:', modelCachePath);
    console.log('[Transformers.js] 镜像源:', env.remoteHost);

    return { pipeline, env };
  } catch (error) {
    console.error('[Transformers.js] 初始化失败:', error);
    throw error;
  }
}

// 可用的本地模型
export interface LocalModel {
  id: string;
  name: string;
  description: string;
  size: string;
  task: 'text-generation' | 'text2text-generation';
}

// 推荐的轻量级模型列表
// 参考: https://huggingface.co/models?library=transformers.js
export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'Xenova/LaMini-Flan-T5-248M',
    name: 'LaMini T5 (248M)',
    description: '超轻量指令模型，适合简单任务',
    size: '~250MB',
    task: 'text2text-generation',
  },
  {
    id: 'Xenova/flan-t5-small',
    name: 'Flan-T5 Small',
    description: 'Google Flan-T5 小型版',
    size: '~300MB',
    task: 'text2text-generation',
  },
  {
    id: 'Xenova/distilgpt2',
    name: 'DistilGPT2',
    description: '轻量级 GPT-2，快速响应',
    size: '~80MB',
    task: 'text-generation',
  },
  {
    id: 'Xenova/gpt2',
    name: 'GPT-2',
    description: 'OpenAI GPT-2 基础版',
    size: '~500MB',
    task: 'text-generation',
  },
  {
    id: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    name: 'SmolLM2 135M',
    description: 'HuggingFace 超小型指令模型',
    size: '~135MB',
    task: 'text-generation',
  },
];

// 模型加载状态
interface ModelStatus {
  loading: boolean;
  loaded: boolean;
  progress: number;
  error?: string;
}

class LocalAIService {
  private generator: any = null;
  private currentModelId: string | null = null;
  private modelStatus: Map<string, ModelStatus> = new Map();
  private loadingPromise: Promise<void> | null = null;

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): LocalModel[] {
    return LOCAL_MODELS;
  }

  /**
   * 获取模型状态
   */
  getModelStatus(modelId: string): ModelStatus {
    return this.modelStatus.get(modelId) || {
      loading: false,
      loaded: false,
      progress: 0,
    };
  }

  /**
   * 获取当前加载的模型
   */
  getCurrentModel(): string | null {
    return this.currentModelId;
  }

  /**
   * 加载模型
   */
  async loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<boolean> {
    // 如果已经加载了相同模型，直接返回
    if (this.currentModelId === modelId && this.generator) {
      return true;
    }

    // 如果正在加载，等待加载完成
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.currentModelId === modelId;
    }

    // 查找模型配置，如果不在列表中则使用默认配置
    let model = LOCAL_MODELS.find(m => m.id === modelId);
    if (!model) {
      // 支持加载不在列表中的模型，默认使用 text-generation
      console.log(`[Transformers.js] 模型 ${modelId} 不在预设列表中，尝试动态加载`);
      model = {
        id: modelId,
        name: modelId.split('/').pop() || modelId,
        description: '动态加载的模型',
        size: '未知',
        task: 'text-generation',
      };
    }

    // 更新状态
    this.modelStatus.set(modelId, {
      loading: true,
      loaded: false,
      progress: 0,
    });

    this.loadingPromise = (async () => {
      try {
        console.log(`开始加载模型: ${modelId}`);
        
        // 释放之前的模型
        if (this.generator) {
          this.generator = null;
          this.currentModelId = null;
        }

        // 初始化 Transformers.js 并加载模型
        const { pipeline: pipelineFn } = await initTransformers();
        
        // 使用 pipeline API 加载模型
        // 参考: https://huggingface.co/docs/transformers.js/api/pipelines
        this.generator = await pipelineFn(model.task, modelId, {
          // 进度回调
          progress_callback: (progress: any) => {
            // progress 对象包含 status, file, progress 等字段
            const percent = typeof progress.progress === 'number' ? progress.progress : 0;
            this.modelStatus.set(modelId, {
              loading: true,
              loaded: false,
              progress: percent,
            });
            onProgress?.(percent);
            
            // 打印下载进度
            if (progress.status === 'downloading') {
              console.log(`[模型下载] ${progress.file}: ${(percent * 100).toFixed(1)}%`);
            }
          },
          // 量化配置 (可选，用于减少模型大小)
          // dtype: 'q8', // 8-bit 量化
        });

        this.currentModelId = modelId;
        this.modelStatus.set(modelId, {
          loading: false,
          loaded: true,
          progress: 100,
        });

        console.log(`模型加载完成: ${modelId}`);
      } catch (error: any) {
        console.error(`模型加载失败: ${modelId}`, error);
        this.modelStatus.set(modelId, {
          loading: false,
          loaded: false,
          progress: 0,
          error: error.message,
        });
        throw error;
      } finally {
        this.loadingPromise = null;
      }
    })();

    await this.loadingPromise;
    return true;
  }

  /**
   * 生成回复
   */
  async chat(messages: Array<{ role: string; content: string }>): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    if (!this.generator || !this.currentModelId) {
      return {
        success: false,
        error: '请先加载模型',
      };
    }

    try {
      // 构建提示词
      const prompt = this.buildPrompt(messages);
      
      // 生成回复
      const result = await this.generator(prompt, {
        max_new_tokens: 512,
        temperature: 0.7,
        do_sample: true,
        top_p: 0.9,
      });

      // 提取生成的文本
      let generatedText = '';
      if (Array.isArray(result) && result.length > 0) {
        const firstResult = result[0] as any;
        generatedText = firstResult.generated_text || '';
      }

      // 移除原始提示词，只保留生成的部分
      if (generatedText.startsWith(prompt)) {
        generatedText = generatedText.slice(prompt.length).trim();
      }

      return {
        success: true,
        content: generatedText || '(无回复)',
      };
    } catch (error: any) {
      console.error('生成失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(messages: Array<{ role: string; content: string }>): string {
    // 简单的对话格式
    let prompt = '';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        prompt += `System: ${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n`;
      }
    }
    
    prompt += 'Assistant:';
    return prompt;
  }

  /**
   * 卸载模型释放内存
   */
  unloadModel() {
    if (this.generator) {
      this.generator = null;
      this.currentModelId = null;
      console.log('模型已卸载');
    }
  }
}

// 单例
let localAIService: LocalAIService | null = null;

export function getLocalAIService(): LocalAIService {
  if (!localAIService) {
    localAIService = new LocalAIService();
  }
  return localAIService;
}

export { LocalAIService };

/**
 * 供应商配置加载器
 */

import { ProviderConfig } from '../types';

// 导入所有供应商配置
import githubConfig from './github.json';
import deepseekConfig from './deepseek.json';
import moonshotConfig from './moonshot.json';
import kimiCodingConfig from './kimi-coding.json';
import zhipuConfig from './zhipu.json';
import dashscopeConfig from './dashscope.json';
import baiduConfig from './baidu.json';
import geminiConfig from './gemini.json';
import siliconflowConfig from './siliconflow.json';

// 所有供应商配置列表
export const providerConfigs: ProviderConfig[] = [
  githubConfig as ProviderConfig,
  deepseekConfig as ProviderConfig,
  moonshotConfig as ProviderConfig,
  kimiCodingConfig as ProviderConfig,
  zhipuConfig as ProviderConfig,
  dashscopeConfig as ProviderConfig,
  baiduConfig as ProviderConfig,
  geminiConfig as ProviderConfig,
  siliconflowConfig as ProviderConfig,
].sort((a, b) => (a.priority || 99) - (b.priority || 99));

// 根据 ID 获取供应商配置
export function getProviderConfig(id: string): ProviderConfig | undefined {
  return providerConfigs.find(p => p.id === id);
}

// 获取所有供应商 ID
export function getAllProviderIds(): string[] {
  return providerConfigs.map(p => p.id);
}

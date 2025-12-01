import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, Sparkles, Settings, AlertCircle, Globe, ChevronDown, ArrowUp, BookPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { useBookSourceStore } from '../stores/bookSourceStore';

// 声明全局 aiApi
declare global {
  interface Window {
    aiApi?: {
      chat: (messages: Array<{ role: string; content: string }>) => Promise<{
        success: boolean;
        content?: string;
        provider?: string;
        error?: string;
      }>;
      chatWithKnowledge: (userMessage: string, pageContent?: any, chatHistory?: Array<{ role: string; content: string }>) => Promise<{
        success: boolean;
        content?: string;
        provider?: string;
        error?: string;
      }>;
      getProviders: () => Promise<{
        success: boolean;
        providers?: Array<{
          id: string;
          name: string;
          enabled: boolean;
          apiKey?: string;
          model?: string;
          availableModels?: string[];
          dailyLimit?: number;
          monthlyLimit?: number;
        }>;
      }>;
      updateProvider: (id: string, config: any) => Promise<{ success: boolean }>;
      getUsageStats: () => Promise<{
        success: boolean;
        stats?: Record<string, {
          daily: number;
          monthly: number;
          limit: { daily?: number; monthly?: number };
        }>;
      }>;
      extractPage: (url: string) => Promise<{
        success: boolean;
        content?: {
          url: string;
          title: string;
          selectors: Record<string, string>;
          structure: Record<string, string>;
          features: {
            hasPagination: boolean;
            usesLazyLoad: boolean;
            dynamicLoading: boolean;
            hasLogin: boolean;
            isEncrypted: boolean;
          };
          samples: {
            books: string[];
            chapters: string[];
            text: string;
          };
        };
        error?: string;
      }>;
    };
  }
}

interface ProviderInfo {
  id: string;
  name: string;
  model?: string;
  availableModels?: string[];
  enabled: boolean;
  hasKey: boolean;
  dailyUsed: number;
  dailyLimit?: number;
  monthlyUsed: number;
  monthlyLimit?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: string;
}

/**
 * 智能裁剪响应数据
 * 根据内容类型和测试模式进行智能裁剪，保留关键结构信息
 */
function smartTrimResponse(rawResponse: string, testMode: string): string {
  const MAX_LENGTH = 8000; // 最大字符数
  const originalLength = rawResponse.length;
  
  // 如果数据量不大，直接返回
  if (originalLength <= MAX_LENGTH) {
    return `原始响应（${originalLength.toLocaleString()}字符）：\n${rawResponse}`;
  }

  let trimmed = rawResponse;

  // 1. 尝试检测是否为 JSON
  try {
    const jsonData = JSON.parse(rawResponse);
    // 是 JSON，智能裁剪
    const trimmedJson = smartTrimJson(jsonData, MAX_LENGTH);
    return `原始响应（JSON，原${originalLength.toLocaleString()}字符，已智能裁剪）：\n${trimmedJson}`;
  } catch {
    // 不是 JSON，继续处理 HTML
  }

  // 2. HTML 智能裁剪
  // 移除不必要的内容
  trimmed = trimmed
    // 移除 script 标签及内容
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除 style 标签及内容
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // 移除 HTML 注释
    .replace(/<!--[\s\S]*?-->/g, '')
    // 移除 SVG
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    // 移除 noscript
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    // 移除 base64 图片数据
    .replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[base64图片]')
    // 压缩多余空白
    .replace(/\s+/g, ' ')
    .trim();

  // 3. 根据测试模式提取关键部分
  let keyParts = '';
  
  if (testMode === 'search') {
    // 搜索模式：尝试提取搜索结果列表区域
    const listPatterns = [
      /<ul[^>]*class="[^"]*(?:search|result|list|book)[^"]*"[^>]*>[\s\S]*?<\/ul>/gi,
      /<div[^>]*class="[^"]*(?:search|result|list|book|item)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /<table[^>]*>[\s\S]*?<\/table>/gi,
    ];
    for (const pattern of listPatterns) {
      const matches = trimmed.match(pattern);
      if (matches && matches.length > 0) {
        keyParts = matches.slice(0, 3).join('\n...\n');
        break;
      }
    }
  } else if (testMode === 'toc') {
    // 目录模式：提取章节列表
    const tocPatterns = [
      /<ul[^>]*class="[^"]*(?:chapter|toc|catalog|list)[^"]*"[^>]*>[\s\S]*?<\/ul>/gi,
      /<div[^>]*class="[^"]*(?:chapter|toc|catalog)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ];
    for (const pattern of tocPatterns) {
      const matches = trimmed.match(pattern);
      if (matches && matches.length > 0) {
        keyParts = matches.slice(0, 2).join('\n...\n');
        break;
      }
    }
  } else if (testMode === 'content') {
    // 正文模式：提取正文内容区域
    const contentPatterns = [
      /<div[^>]*(?:id|class)="[^"]*(?:content|chapter|article|text|reader)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
    ];
    for (const pattern of contentPatterns) {
      const matches = trimmed.match(pattern);
      if (matches && matches.length > 0) {
        keyParts = matches[0].slice(0, MAX_LENGTH / 2);
        break;
      }
    }
  }

  // 4. 组合结果
  if (keyParts && keyParts.length > 100) {
    // 有提取到关键部分
    const headPart = trimmed.slice(0, 2000);
    return `原始响应（HTML，原${originalLength.toLocaleString()}字符，已智能裁剪）：

【页面头部结构】
${headPart}
...

【关键内容区域】
${keyParts.slice(0, MAX_LENGTH - 3000)}
...`;
  }

  // 5. 没有提取到关键部分，使用首尾裁剪
  const headLength = Math.floor(MAX_LENGTH * 0.7);
  const tailLength = Math.floor(MAX_LENGTH * 0.2);
  
  return `原始响应（HTML，原${originalLength.toLocaleString()}字符，已裁剪）：

【前${headLength}字符】
${trimmed.slice(0, headLength)}

...（省略 ${(trimmed.length - headLength - tailLength).toLocaleString()} 字符）...

【后${tailLength}字符】
${trimmed.slice(-tailLength)}`;
}

/**
 * 智能裁剪 JSON 数据
 */
function smartTrimJson(data: any, maxLength: number): string {
  // 如果是数组，只保留前几个元素
  if (Array.isArray(data)) {
    const sampleSize = Math.min(5, data.length);
    const sample = data.slice(0, sampleSize);
    const result = {
      _info: `数组共 ${data.length} 项，显示前 ${sampleSize} 项`,
      data: sample,
    };
    let json = JSON.stringify(result, null, 2);
    if (json.length > maxLength) {
      // 进一步裁剪每个元素
      const trimmedSample = sample.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return trimObject(item, 5); // 只保留前5个字段
        }
        return item;
      });
      json = JSON.stringify({ _info: result._info, data: trimmedSample }, null, 2);
    }
    return json.slice(0, maxLength);
  }

  // 如果是对象，裁剪字段
  if (typeof data === 'object' && data !== null) {
    const trimmedData = trimObject(data, 20);
    return JSON.stringify(trimmedData, null, 2).slice(0, maxLength);
  }

  return JSON.stringify(data).slice(0, maxLength);
}

/**
 * 裁剪对象，只保留指定数量的字段
 */
function trimObject(obj: any, maxFields: number): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const keys = Object.keys(obj);
  if (keys.length <= maxFields) return obj;
  
  const result: any = {};
  keys.slice(0, maxFields).forEach(key => {
    const value = obj[key];
    if (typeof value === 'string' && value.length > 200) {
      result[key] = value.slice(0, 200) + '...';
    } else if (Array.isArray(value)) {
      result[key] = value.slice(0, 3);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = trimObject(value, 5);
    } else {
      result[key] = value;
    }
  });
  result._trimmed = `还有 ${keys.length - maxFields} 个字段未显示`;
  return result;
}

export function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是书源助手，可以帮你：\n\n• 分析网页结构，生成书源规则\n• 解答书源编写问题\n• 调试和优化现有规则\n\n请输入网址或描述你的需求。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [currentProvider, setCurrentProvider] = useState<ProviderInfo | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 获取书源 store
  const { sources, importSources, selectSource } = useBookSourceStore();

  // 系统提示词已移至后端 rule-knowledge-injector.ts
  // AI 会先学习完整的书源规则知识库再回答问题

  /**
   * 从 AI 响应中提取书源 JSON 并自动创建
   */
  const extractAndCreateBookSource = (content: string): { created: boolean; name?: string; error?: string } => {
    try {
      // 尝试从内容中提取 JSON 代码块
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : null;
      
      // 如果没有代码块，尝试直接查找 JSON 对象
      if (!jsonStr) {
        const objectMatch = content.match(/\{[\s\S]*"bookSourceUrl"[\s\S]*"bookSourceName"[\s\S]*\}/);
        jsonStr = objectMatch ? objectMatch[0] : null;
      }
      
      if (!jsonStr) {
        return { created: false };
      }

      // 解析 JSON
      const sourceData = JSON.parse(jsonStr);
      
      // 验证必要字段
      if (!sourceData.bookSourceUrl || !sourceData.bookSourceName) {
        return { created: false, error: '缺少必要字段' };
      }

      // 检查是否已存在同名或同URL的书源
      const existingByUrl = sources.find(s => s.bookSourceUrl === sourceData.bookSourceUrl);
      const existingByName = sources.find(s => s.bookSourceName === sourceData.bookSourceName);
      
      if (existingByUrl) {
        return { created: false, error: `书源 URL 已存在: ${sourceData.bookSourceUrl}` };
      }
      
      if (existingByName) {
        return { created: false, error: `书源名称已存在: ${sourceData.bookSourceName}` };
      }

      // 导入书源
      const count = importSources(JSON.stringify(sourceData));
      
      if (count > 0) {
        // 选中新创建的书源
        selectSource(sourceData.bookSourceUrl);
        return { created: true, name: sourceData.bookSourceName };
      }
      
      return { created: false, error: '导入失败' };
    } catch (e: any) {
      console.error('解析书源 JSON 失败:', e);
      return { created: false, error: e.message };
    }
  };

  // 检查 API Key 状态和加载供应商信息
  useEffect(() => {
    loadProviderInfo();
  }, []);

  const loadProviderInfo = async () => {
    if (!window.aiApi) return;

    try {
      const [providersResult, statsResult] = await Promise.all([
        window.aiApi.getProviders(),
        window.aiApi.getUsageStats(),
      ]);

      if (providersResult.success && providersResult.providers) {
        const stats = statsResult.success ? statsResult.stats : {};
        
        const providerInfos: ProviderInfo[] = providersResult.providers.map(p => ({
          id: p.id,
          name: p.name,
          model: p.model,
          availableModels: p.availableModels,
          enabled: p.enabled,
          hasKey: !!p.apiKey,
          dailyUsed: stats?.[p.id]?.daily || 0,
          dailyLimit: p.dailyLimit,
          monthlyUsed: stats?.[p.id]?.monthly || 0,
          monthlyLimit: p.monthlyLimit,
        }));

        setProviders(providerInfos);
        
        // 找到当前可用的供应商（本地模型不需要 API Key）
        const activeProvider = providerInfos.find(p => p.enabled && (p.hasKey || p.id === 'local'));
        setCurrentProvider(activeProvider || null);
        setHasApiKey(!!activeProvider);
      }
    } catch (error) {
      console.error('加载供应商信息失败:', error);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 保存 API Key
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    
    if (window.aiApi) {
      await window.aiApi.updateProvider('github', {
        apiKey: apiKey.trim(),
        enabled: true,
      });
      setShowSettings(false);
      setApiKey('');
      
      // 刷新供应商信息
      await loadProviderInfo();
      
      // 添加提示消息
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ API Key 已保存！现在可以开始对话了。',
        timestamp: new Date(),
      }]);
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      if (!window.aiApi) {
        throw new Error('AI API 不可用');
      }

      let pageContent: any = null;

      // 如果设置了分析网址，先抓取网页内容
      if (analyzeUrl) {
        // 添加抓取状态消息
        const extractingMsg: Message = {
          id: (Date.now() + 0.5).toString(),
          role: 'assistant',
          content: `🔍 正在分析网站: ${analyzeUrl}...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, extractingMsg]);

        const extractResult = await window.aiApi.extractPage(analyzeUrl);
        
        if (!extractResult.success) {
          throw new Error(`网页抓取失败: ${extractResult.error}`);
        }

        pageContent = extractResult.content;

        // 更新状态消息
        setMessages((prev) => prev.map(m => 
          m.id === extractingMsg.id 
            ? { ...m, content: `✅ 网站分析完成: ${pageContent.title}` }
            : m
        ));
      }

      // 构建消息历史（过滤掉状态消息）
      const chatHistory = messages
        .filter(m => m.role !== 'system' && !m.content.startsWith('🔍') && !m.content.startsWith('✅ 网站分析'))
        .map(m => ({ role: m.role, content: m.content }));

      // 检查是否需要附加测试结果数据
      const state = useBookSourceStore.getState();
      let finalUserInput = userInput;
      
      if (state.aiAnalysisEnabled && state.testResult?.rawResponse) {
        // 获取当前书源信息
        const activeSource = state.sources.find(s => s.bookSourceUrl === state.activeSourceId);
        const sourceInfo = activeSource ? JSON.stringify({
          bookSourceUrl: activeSource.bookSourceUrl,
          bookSourceName: activeSource.bookSourceName,
          ruleSearch: activeSource.ruleSearch,
          ruleBookInfo: activeSource.ruleBookInfo,
          ruleToc: activeSource.ruleToc,
          ruleContent: activeSource.ruleContent,
        }, null, 2) : '无';

        // 智能裁剪原始响应数据
        const trimmedResponse = smartTrimResponse(state.testResult.rawResponse, state.testMode);

        // 附加测试结果数据
        finalUserInput = `${userInput}

---
【附加数据：规则测试结果】
测试模式：${state.testMode}
测试输入：${state.testInput}
测试结果：${state.testResult.success ? '成功' : '失败'}
${state.testResult.rawParsedItems ? `解析到 ${Array.isArray(state.testResult.rawParsedItems) ? state.testResult.rawParsedItems.length : 1} 条数据` : ''}

当前书源规则：
${sourceInfo}

${trimmedResponse}
---`;
      }

      // 始终使用带知识库的 API（AI 会先学习规则体系再回答）
      const result = await window.aiApi.chatWithKnowledge(finalUserInput, pageContent || undefined, chatHistory);

      if (result.success && result.content) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.content,
          timestamp: new Date(),
          provider: result.provider,
        };
        setMessages((prev) => [...prev, aiResponse]);
        
        // 尝试从 AI 响应中提取书源 JSON 并自动创建
        const createResult = extractAndCreateBookSource(result.content);
        if (createResult.created) {
          // 添加成功提示
          const successMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `✅ 已自动创建书源：**${createResult.name}**\n\n书源已添加到左侧列表，你可以点击查看和编辑。`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);
        } else if (createResult.error) {
          // 如果有错误但不是"没找到JSON"的情况，显示提示
          const infoMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `ℹ️ 未自动创建书源：${createResult.error}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, infoMsg]);
        }
        
        // 清除已使用的分析网址
        if (analyzeUrl) {
          setAnalyzeUrl('');
        }
      } else {
        // 显示错误
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${result.error || '请求失败，请稍后重试'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 发生错误: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: '对话已清空。有什么可以帮你的？',
        timestamp: new Date(),
      },
    ]);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col border-l bg-card">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">AI 助手</span>
          {!hasApiKey && (
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
              未配置
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowSettings(!showSettings)}
            title="设置"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClear}
            title="清空对话"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="border-b bg-muted/50 p-4">
          <div className="mb-2 text-sm font-medium">GitHub Models API Key</div>
          <div className="mb-2 text-xs text-muted-foreground">
            从 <a href="https://github.com/marketplace/models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub Models</a> 获取免费 API Key
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex-1 text-sm"
            />
            <Button size="sm" onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
              保存
            </Button>
          </div>
        </div>
      )}

      {/* 未配置提示 */}
      {!hasApiKey && !showSettings && (
        <div className="flex items-center gap-2 border-b bg-yellow-50 px-4 py-2 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-xs text-yellow-700 dark:text-yellow-300">
            请先配置 API Key 才能使用 AI 功能
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => setShowSettings(true)}
          >
            去配置
          </Button>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              {/* 头像 */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  message.role === 'assistant'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {message.role === 'assistant' ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>

              {/* 消息内容 */}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5',
                  message.role === 'assistant'
                    ? 'bg-muted'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {/* 加载中 */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 - 参考图片样式 */}
      <div className="border-t p-3">
        {/* 主输入框 */}
        <div className="rounded-2xl border bg-muted/30 p-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.currentTarget.focus()}
            placeholder="尽管问..."
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            rows={2}
          />
          
          {/* 底部工具栏 */}
          <div className="mt-2 flex items-center justify-between">
            {/* 左侧：设置按钮 */}
            <div className="flex items-center gap-1">
              <Popover open={showUrlInput} onOpenChange={setShowUrlInput}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      showUrlInput || analyzeUrl
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title="设置分析网址"
                  >
                    <Globe className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-80">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">分析目标网站</div>
                    <div className="text-xs text-muted-foreground">
                      输入要分析的网站地址，AI 将帮助生成书源规则
                    </div>
                    <Input
                      value={analyzeUrl}
                      onChange={(e) => setAnalyzeUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="text-sm"
                    />
                    {analyzeUrl && (
                      <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{analyzeUrl}</span>
                        <button
                          onClick={() => setAnalyzeUrl('')}
                          className="ml-auto text-primary/60 hover:text-primary"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 显示已设置的URL标签 */}
              {analyzeUrl && !showUrlInput && (
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                  <Globe className="h-3 w-3" />
                  <span className="max-w-[100px] truncate">{new URL(analyzeUrl).hostname}</span>
                  <button
                    onClick={() => setAnalyzeUrl('')}
                    className="text-primary/60 hover:text-primary"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* 右侧：模型选择 + 发送按钮 */}
            <div className="flex items-center gap-2">
              {/* 模型选择下拉 */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <span>{currentProvider?.name || '选择供应商'} / {currentProvider?.model?.split('/').pop()?.slice(0, 12) || '模型'}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-72">
                  <div className="space-y-3">
                    {/* 供应商选择 */}
                    <div>
                      <div className="mb-1.5 text-xs text-muted-foreground">供应商</div>
                      <select
                        value={currentProvider?.id || ''}
                        onChange={async (e) => {
                          const newProvider = providers.find(p => p.id === e.target.value);
                          if (newProvider && window.aiApi && currentProvider) {
                            // 禁用当前供应商，启用新供应商
                            await window.aiApi.updateProvider(currentProvider.id, { enabled: false });
                            await window.aiApi.updateProvider(newProvider.id, { enabled: true });
                            await loadProviderInfo();
                          }
                        }}
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                      >
                        {/* 本地模型不需要 API Key，其他供应商需要 */}
                        {providers.filter(p => p.hasKey || p.id === 'local').map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {providers.filter(p => p.hasKey || p.id === 'local').length === 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">暂无可用供应商，请先配置 API Key</div>
                      )}
                    </div>

                    {/* 模型选择 */}
                    {currentProvider && (
                      <>
                        <div>
                          <div className="mb-1.5 text-xs text-muted-foreground">模型</div>
                          <select
                            value={currentProvider.model || ''}
                            onChange={async (e) => {
                              if (window.aiApi) {
                                await window.aiApi.updateProvider(currentProvider.id, { model: e.target.value });
                                await loadProviderInfo();
                              }
                            }}
                            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                          >
                            {currentProvider.availableModels?.map(model => (
                              <option key={model} value={model}>{model}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* 额度显示 */}
                        {currentProvider.dailyLimit && (
                          <div className="border-t pt-2">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">今日额度</span>
                              <span>{currentProvider.dailyUsed}/{currentProvider.dailyLimit}</span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  currentProvider.dailyUsed / currentProvider.dailyLimit > 0.8
                                    ? 'bg-red-500'
                                    : 'bg-primary'
                                )}
                                style={{
                                  width: `${Math.min(100, (currentProvider.dailyUsed / currentProvider.dailyLimit) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 发送按钮 */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                  input.trim() && !isLoading
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        <p className="mt-2 text-center text-xs text-muted-foreground">
          内容由AI生成，请仔细甄别
        </p>
      </div>
    </div>
  );
}

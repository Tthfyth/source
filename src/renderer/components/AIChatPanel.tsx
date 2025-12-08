import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
  Button,
  ActionIcon,
  Paper,
  ScrollArea,
  Badge,
  Popover,
  Select,
  Progress,
  Loader,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSend,
  IconRobot,
  IconUser,
  IconTrash,
  IconSparkles,
  IconSettings,
  IconAlertCircle,
  IconWorld,
  IconChevronDown,
  IconArrowUp,
  IconX,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { AISettingsPanel } from './AISettingsPanel';

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
      chatWithProvider: (messages: Array<{ role: string; content: string }>, providerId: string, modelId?: string) => Promise<{
        success: boolean;
        content?: string;
        provider?: string;
        model?: string;
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
      getProvidersV2: () => Promise<{
        success: boolean;
        providers?: Array<{
          id: string;
          displayName: string;
          baseUrl: string;
          apiKeyTemplate?: string;
          apiKeyUrl?: string;
          models: Array<{
            id: string;
            name: string;
            tooltip?: string;
            maxInputTokens: number;
            maxOutputTokens: number;
          }>;
          dailyLimit?: number;
          monthlyLimit?: number;
          priority?: number;
          userConfig: {
            enabled: boolean;
            apiKey?: string;
            selectedModel?: string;
          };
        }>;
      }>;
      updateProvider: (id: string, config: any) => Promise<{ success: boolean }>;
      setActiveProvider: (providerId: string, modelId?: string) => Promise<{ success: boolean }>;
      getActiveProvider: () => Promise<{
        success: boolean;
        providerId?: string;
        modelId?: string;
      }>;
      getUsageStats: () => Promise<{
        success: boolean;
        stats?: Record<string, {
          daily: number;
          monthly: number;
          dailyTokens?: number;
          monthlyTokens?: number;
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

function smartTrimResponse(rawResponse: string, testMode: string): string {
  const MAX_LENGTH = 8000;
  const originalLength = rawResponse.length;
  
  if (originalLength <= MAX_LENGTH) {
    return `原始响应（${originalLength.toLocaleString()}字符）：\n${rawResponse}`;
  }

  let trimmed = rawResponse;

  try {
    const jsonData = JSON.parse(rawResponse);
    const trimmedJson = smartTrimJson(jsonData, MAX_LENGTH);
    return `原始响应（JSON，原${originalLength.toLocaleString()}字符，已智能裁剪）：\n${trimmedJson}`;
  } catch {
    // 不是 JSON
  }

  trimmed = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[base64图片]')
    .replace(/\s+/g, ' ')
    .trim();

  const headLength = Math.floor(MAX_LENGTH * 0.7);
  const tailLength = Math.floor(MAX_LENGTH * 0.2);
  
  return `原始响应（HTML，原${originalLength.toLocaleString()}字符，已裁剪）：\n${trimmed.slice(0, headLength)}\n...（省略）...\n${trimmed.slice(-tailLength)}`;
}

function smartTrimJson(data: any, maxLength: number): string {
  if (Array.isArray(data)) {
    const sampleSize = Math.min(5, data.length);
    const sample = data.slice(0, sampleSize);
    const result = { _info: `数组共 ${data.length} 项，显示前 ${sampleSize} 项`, data: sample };
    return JSON.stringify(result, null, 2).slice(0, maxLength);
  }
  return JSON.stringify(data, null, 2).slice(0, maxLength);
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
  const [hasApiKey, setHasApiKey] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [currentProvider, setCurrentProvider] = useState<ProviderInfo | null>(null);
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [showUrlPopover, setShowUrlPopover] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { colorScheme } = useMantineColorScheme();

  const { sources, importSources, selectSource } = useBookSourceStore();

  const extractAndCreateBookSource = (content: string): { created: boolean; name?: string; error?: string } => {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : null;
      
      if (!jsonStr) {
        const objectMatch = content.match(/\{[\s\S]*"bookSourceUrl"[\s\S]*"bookSourceName"[\s\S]*\}/);
        jsonStr = objectMatch ? objectMatch[0] : null;
      }
      
      if (!jsonStr) return { created: false };

      const sourceData = JSON.parse(jsonStr);
      
      if (!sourceData.bookSourceUrl || !sourceData.bookSourceName) {
        return { created: false, error: '缺少必要字段' };
      }

      const existingByUrl = sources.find(s => s.bookSourceUrl === sourceData.bookSourceUrl);
      if (existingByUrl) {
        return { created: false, error: `书源 URL 已存在` };
      }

      const count = importSources(JSON.stringify(sourceData));
      
      if (count > 0) {
        selectSource(sourceData.bookSourceUrl);
        return { created: true, name: sourceData.bookSourceName };
      }
      
      return { created: false, error: '导入失败' };
    } catch (e: any) {
      return { created: false, error: e.message };
    }
  };

  useEffect(() => {
    loadProviderInfo();
  }, []);

  const loadProviderInfo = async () => {
    if (!window.aiApi) return;

    try {
      const [providersResult, statsResult] = await Promise.all([
        window.aiApi.getProvidersV2(),
        window.aiApi.getUsageStats(),
      ]);

      if (providersResult.success && providersResult.providers) {
        const stats = statsResult.success ? statsResult.stats : {};
        
        const providerInfos: ProviderInfo[] = providersResult.providers.map(p => ({
          id: p.id,
          name: p.displayName,
          model: p.userConfig.selectedModel || p.models[0]?.id,
          availableModels: p.models.map(m => m.id),
          enabled: p.userConfig.enabled,
          hasKey: !!p.userConfig.apiKey,
          dailyUsed: stats?.[p.id]?.daily || 0,
          dailyLimit: p.dailyLimit,
          monthlyUsed: stats?.[p.id]?.monthly || 0,
          monthlyLimit: p.monthlyLimit,
        }));

        setProviders(providerInfos);
        const activeProvider = providerInfos.find(p => p.enabled && p.hasKey);
        setCurrentProvider(activeProvider || null);
        setHasApiKey(!!activeProvider);
      }
    } catch (error) {
      console.error('加载供应商信息失败:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      if (analyzeUrl) {
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

        setMessages((prev) => prev.map(m => 
          m.id === extractingMsg.id 
            ? { ...m, content: `✅ 网站分析完成: ${pageContent.title}` }
            : m
        ));
      }

      const chatHistory = messages
        .filter(m => m.role !== 'system' && !m.content.startsWith('🔍') && !m.content.startsWith('✅ 网站分析'))
        .map(m => ({ role: m.role, content: m.content }));

      const state = useBookSourceStore.getState();
      let finalUserInput = userInput;
      
      if (state.aiAnalysisEnabled && state.testResult?.rawResponse) {
        const activeSource = state.sources.find(s => s.bookSourceUrl === state.activeSourceId);
        // 根据源格式提取规则信息
        const sourceInfo = activeSource ? JSON.stringify({
          bookSourceUrl: activeSource.bookSourceUrl,
          bookSourceName: activeSource.bookSourceName,
          // Legado 格式字段
          ...('ruleSearch' in activeSource && { ruleSearch: activeSource.ruleSearch }),
          ...('ruleBookInfo' in activeSource && { ruleBookInfo: activeSource.ruleBookInfo }),
          ...('ruleToc' in activeSource && { ruleToc: activeSource.ruleToc }),
          ...('ruleContent' in activeSource && { ruleContent: activeSource.ruleContent }),
          // 异次元格式字段
          ...('ruleSearchUrl' in activeSource && { ruleSearchUrl: activeSource.ruleSearchUrl }),
          ...('ruleSearchList' in activeSource && { ruleSearchList: activeSource.ruleSearchList }),
          ...('ruleChapterList' in activeSource && { ruleChapterList: activeSource.ruleChapterList }),
          ...('ruleBookContent' in activeSource && { ruleBookContent: activeSource.ruleBookContent }),
        }, null, 2) : '无';

        const trimmedResponse = smartTrimResponse(state.testResult.rawResponse, state.testMode);

        finalUserInput = `${userInput}\n\n---\n【附加数据：规则测试结果】\n测试模式：${state.testMode}\n当前书源规则：\n${sourceInfo}\n\n${trimmedResponse}\n---`;
      }

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
        
        const createResult = extractAndCreateBookSource(result.content);
        if (createResult.created) {
          setMessages((prev) => [...prev, {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `✅ 已自动创建书源：**${createResult.name}**`,
            timestamp: new Date(),
          }]);
        }
        
        if (analyzeUrl) setAnalyzeUrl('');
      } else {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${result.error || '请求失败'}`,
          timestamp: new Date(),
        }]);
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 发生错误: ${error.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: '对话已清空。有什么可以帮你的？',
      timestamp: new Date(),
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      h="100%"
      style={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
      })}
    >
      {/* 头部 */}
      <Group
        px="sm"
        py="xs"
        justify="space-between"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        })}
      >
        <Group gap="xs">
          <Box
            w={28}
            h={28}
            style={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.md,
              backgroundColor: 'var(--mantine-color-teal-light)',
            })}
          >
            <IconSparkles size={16} color="var(--mantine-color-teal-6)" />
          </Box>
          <Text size="sm" fw={600}>AI 助手</Text>
          {!hasApiKey && (
            <Badge size="xs" color="yellow" variant="light">未配置</Badge>
          )}
        </Group>
        <Group gap={4}>
          <ActionIcon variant="subtle" size="sm" onClick={() => setShowSettings(!showSettings)} data-tour="ai-settings">
            <IconSettings size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="sm" onClick={handleClear}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {/* 设置面板 */}
      {showSettings && (
        <Box
          style={(theme) => ({
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
            overflow: 'auto',
          })}
        >
          <Group
            px="sm"
            py="xs"
            justify="space-between"
            style={(theme) => ({
              borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
              position: 'sticky',
              top: 0,
              backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
              zIndex: 1,
            })}
          >
            <Text size="sm" fw={600}>AI 供应商设置</Text>
            <ActionIcon variant="subtle" size="sm" onClick={() => {
              setShowSettings(false);
              loadProviderInfo();
            }}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
          <AISettingsPanel onClose={() => {
            setShowSettings(false);
            loadProviderInfo();
          }} />
        </Box>
      )}

      {/* 未配置提示 */}
      {!hasApiKey && !showSettings && (
        <Group
          gap="xs"
          px="sm"
          py="xs"
          style={{ backgroundColor: 'var(--mantine-color-yellow-light)' }}
        >
          <IconAlertCircle size={16} color="var(--mantine-color-yellow-6)" />
          <Text size="xs" c="yellow.7">请先配置 API Key</Text>
          <Button variant="subtle" size="xs" onClick={() => setShowSettings(true)}>
            去配置
          </Button>
        </Group>
      )}

      {/* 消息列表 */}
      <ScrollArea style={{ flex: 1 }} p="sm">
        <Stack gap="md">
          {messages.map((message) => (
            <Group
              key={message.id}
              gap="sm"
              align="flex-start"
              style={{ flexDirection: message.role === 'user' ? 'row-reverse' : 'row' }}
            >
              <Box
                w={32}
                h={32}
                style={(theme) => ({
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: message.role === 'assistant'
                    ? 'var(--mantine-color-teal-light)'
                    : colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2],
                })}
              >
                {message.role === 'assistant' ? (
                  <IconRobot size={16} color="var(--mantine-color-teal-6)" />
                ) : (
                  <IconUser size={16} />
                )}
              </Box>

              <Paper
                p="sm"
                radius="lg"
                maw="85%"
                style={(theme) => ({
                  backgroundColor: message.role === 'assistant'
                    ? colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1]
                    : theme.colors.teal[6],
                  color: message.role === 'user' ? theme.white : undefined,
                })}
              >
                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {message.content}
                </Text>
              </Paper>
            </Group>
          ))}

          {isLoading && (
            <Group gap="sm" align="flex-start">
              <Box
                w={32}
                h={32}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-teal-light)',
                }}
              >
                <IconRobot size={16} color="var(--mantine-color-teal-6)" />
              </Box>
              <Paper p="sm" radius="lg" bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
                <Group gap="xs">
                  <Loader size="xs" />
                  <Text size="sm" c="dimmed">思考中...</Text>
                </Group>
              </Paper>
            </Group>
          )}

          <div ref={messagesEndRef} />
        </Stack>
      </ScrollArea>

      {/* 输入区域 */}
      <Box
        p="sm"
        style={(theme) => ({
          borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        })}
      >
        <Paper p="sm" radius="lg" withBorder>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="尽管问..."
            autosize
            minRows={2}
            maxRows={4}
            variant="unstyled"
            size="sm"
          />
          
          <Group justify="space-between" mt="xs">
            <Group gap="xs">
              <Popover opened={showUrlPopover} onChange={setShowUrlPopover} position="top-start">
                <Popover.Target>
                  <ActionIcon
                    variant={analyzeUrl ? 'light' : 'subtle'}
                    color={analyzeUrl ? 'teal' : undefined}
                    onClick={() => setShowUrlPopover(!showUrlPopover)}
                  >
                    <IconWorld size={16} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs" w={280}>
                    <Text size="sm" fw={500}>分析目标网站</Text>
                    <Text size="xs" c="dimmed">输入要分析的网站地址</Text>
                    <TextInput
                      value={analyzeUrl}
                      onChange={(e) => setAnalyzeUrl(e.currentTarget.value)}
                      placeholder="https://example.com"
                      size="xs"
                    />
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              {analyzeUrl && (
                <Badge
                  size="sm"
                  variant="light"
                  color="teal"
                  rightSection={
                    <ActionIcon size="xs" variant="transparent" onClick={() => setAnalyzeUrl('')}>
                      ×
                    </ActionIcon>
                  }
                >
                  {new URL(analyzeUrl).hostname}
                </Badge>
              )}
            </Group>

            <Group gap="xs">
              {/* 供应商/模型选择器 - 下拉框形式 */}
              {providers.filter(p => p.enabled && p.hasKey).length === 0 ? (
                <Button variant="subtle" size="xs" onClick={() => setShowSettings(true)}>
                  配置供应商
                </Button>
              ) : (
                <Select
                  size="xs"
                  placeholder="选择模型"
                  value={currentProvider ? `${currentProvider.id}:${currentProvider.model}` : null}
                  onChange={async (value) => {
                    if (!value) return;
                    const [providerId, modelId] = value.split(':');
                    const provider = providers.find(p => p.id === providerId);
                    if (provider) {
                      await window.aiApi?.setActiveProvider(providerId, modelId);
                      await window.aiApi?.updateProvider(providerId, { selectedModel: modelId });
                      setCurrentProvider({ ...provider, model: modelId });
                    }
                  }}
                  data={providers
                    .filter(p => p.enabled && p.hasKey)
                    .map(provider => ({
                      group: provider.name,
                      items: (provider.availableModels || []).map(modelId => ({
                        value: `${provider.id}:${modelId}`,
                        label: modelId.split('/').pop() || modelId,
                      })),
                    }))}
                  styles={{
                    input: { minWidth: 140, fontSize: 12 },
                    dropdown: { maxHeight: 300 },
                  }}
                  comboboxProps={{ position: 'top', withinPortal: true }}
                  rightSection={<IconChevronDown size={12} />}
                  rightSectionWidth={24}
                />
              )}

              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <IconSettings size={14} />
              </ActionIcon>

              <ActionIcon
                size="lg"
                radius="xl"
                variant={input.trim() && !isLoading ? 'filled' : 'light'}
                color="teal"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? <Loader size="xs" color="white" /> : <IconArrowUp size={18} />}
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
        
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          内容由AI生成，请仔细甄别
        </Text>
      </Box>
    </Box>
  );
}

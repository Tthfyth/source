/**
 * AI 设置面板
 * 管理 AI 供应商配置、模型选择等
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  TextInput,
  Button,
  Switch,
  Select,
  Badge,
  Paper,
  Accordion,
  Progress,
  Loader,
  ActionIcon,
  Tooltip,
  Anchor,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconX,
  IconExternalLink,
  IconKey,
  IconRobot,
  IconRefresh,
} from '@tabler/icons-react';

// 供应商配置类型
interface ModelConfig {
  id: string;
  name: string;
  tooltip?: string;
  maxInputTokens: number;
  maxOutputTokens: number;
}

interface ProviderConfig {
  id: string;
  displayName: string;
  baseUrl: string;
  apiKeyTemplate?: string;
  apiKeyUrl?: string;
  models: ModelConfig[];
  dailyLimit?: number;
  monthlyLimit?: number;
  priority?: number;
  userConfig: {
    enabled: boolean;
    apiKey?: string;
    selectedModel?: string;
  };
}

interface UsageStats {
  [providerId: string]: {
    daily: number;
    monthly: number;
    dailyTokens?: number;
    monthlyTokens?: number;
    limit: { daily?: number; monthly?: number };
  };
}

interface AISettingsPanelProps {
  onClose?: () => void;
}

export function AISettingsPanel({ onClose }: AISettingsPanelProps) {
  const { colorScheme } = useMantineColorScheme();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats>({});
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [activeProvider, setActiveProvider] = useState<{ providerId?: string; modelId?: string }>({});

  // 加载供应商配置
  const loadProviders = async () => {
    try {
      setLoading(true);
      const [providersResult, statsResult, activeResult] = await Promise.all([
        window.aiApi?.getProvidersV2(),
        window.aiApi?.getUsageStats(),
        window.aiApi?.getActiveProvider(),
      ]);

      if (providersResult?.success && providersResult.providers) {
        setProviders(providersResult.providers);
      }
      if (statsResult?.success && statsResult.stats) {
        setUsageStats(statsResult.stats);
      }
      if (activeResult?.success) {
        setActiveProvider({
          providerId: activeResult.providerId,
          modelId: activeResult.modelId,
        });
      }
    } catch (error) {
      console.error('加载供应商配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  // 保存 API Key
  const saveApiKey = async (providerId: string) => {
    const apiKey = editingKeys[providerId];
    if (!apiKey?.trim()) return;

    setSavingProvider(providerId);
    try {
      await window.aiApi?.updateProvider(providerId, {
        apiKey: apiKey.trim(),
        enabled: true,
      });
      
      // 清除编辑状态
      setEditingKeys(prev => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });

      notifications.show({
        title: '保存成功',
        message: 'API Key 已保存',
        color: 'teal',
      });

      // 重新加载
      await loadProviders();
    } catch (error: any) {
      notifications.show({
        title: '保存失败',
        message: error.message,
        color: 'red',
      });
    } finally {
      setSavingProvider(null);
    }
  };

  // 切换供应商启用状态
  const toggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      await window.aiApi?.updateProvider(providerId, { enabled });
      await loadProviders();
    } catch (error: any) {
      notifications.show({
        title: '操作失败',
        message: error.message,
        color: 'red',
      });
    }
  };

  // 选择模型
  const selectModel = async (providerId: string, modelId: string) => {
    try {
      await window.aiApi?.updateProvider(providerId, { selectedModel: modelId });
      await loadProviders();
    } catch (error: any) {
      notifications.show({
        title: '操作失败',
        message: error.message,
        color: 'red',
      });
    }
  };

  // 设置为当前活动供应商
  const setAsActive = async (providerId: string, modelId?: string) => {
    try {
      await window.aiApi?.setActiveProvider(providerId, modelId);
      setActiveProvider({ providerId, modelId });
      notifications.show({
        message: '已设置为默认供应商',
        color: 'teal',
      });
    } catch (error: any) {
      notifications.show({
        title: '操作失败',
        message: error.message,
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Box p="xl" ta="center">
        <Loader size="lg" />
        <Text mt="md" c="dimmed">加载供应商配置...</Text>
      </Box>
    );
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconRobot size={20} />
          <Text size="lg" fw={600}>AI 供应商设置</Text>
        </Group>
        <ActionIcon variant="subtle" onClick={loadProviders}>
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>

      <Accordion variant="separated" radius="md">
        {providers.map((provider) => {
          const stats = usageStats[provider.id];
          const isActive = activeProvider.providerId === provider.id;
          const hasKey = !!provider.userConfig.apiKey;
          const isEditing = editingKeys[provider.id] !== undefined;

          return (
            <Accordion.Item key={provider.id} value={provider.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap" pr="md">
                  <Group gap="sm">
                    <Text fw={500}>{provider.displayName}</Text>
                    {isActive && (
                      <Badge size="xs" color="teal" variant="light">默认</Badge>
                    )}
                    {hasKey && provider.userConfig.enabled && (
                      <Badge size="xs" color="green" variant="dot">已配置</Badge>
                    )}
                    {!hasKey && (
                      <Badge size="xs" color="gray" variant="light">未配置</Badge>
                    )}
                  </Group>
                  <Switch
                    size="sm"
                    checked={provider.userConfig.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleProvider(provider.id, e.currentTarget.checked);
                    }}
                    disabled={!hasKey}
                  />
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Stack gap="md">
                  {/* API Key 配置 */}
                  <Paper p="sm" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <IconKey size={16} />
                        <Text size="sm" fw={500}>API Key</Text>
                      </Group>
                      {provider.apiKeyUrl && (
                        <Anchor
                          href={provider.apiKeyUrl}
                          target="_blank"
                          size="xs"
                          c="dimmed"
                        >
                          获取 Key <IconExternalLink size={12} style={{ marginLeft: 2 }} />
                        </Anchor>
                      )}
                    </Group>

                    <Group gap="xs">
                      <TextInput
                        placeholder={provider.apiKeyTemplate || '请输入 API Key'}
                        value={isEditing ? editingKeys[provider.id] : (hasKey ? '******' : '')}
                        onChange={(e) => setEditingKeys(prev => ({
                          ...prev,
                          [provider.id]: e.currentTarget.value,
                        }))}
                        onFocus={() => {
                          if (!isEditing) {
                            setEditingKeys(prev => ({
                              ...prev,
                              [provider.id]: '',
                            }));
                          }
                        }}
                        style={{ flex: 1 }}
                        size="sm"
                        type={isEditing ? 'text' : 'password'}
                      />
                      {isEditing && (
                        <>
                          <ActionIcon
                            variant="filled"
                            color="teal"
                            onClick={() => saveApiKey(provider.id)}
                            loading={savingProvider === provider.id}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            onClick={() => setEditingKeys(prev => {
                              const next = { ...prev };
                              delete next[provider.id];
                              return next;
                            })}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </>
                      )}
                    </Group>
                  </Paper>

                  {/* 模型选择 */}
                  {hasKey && (
                    <Paper p="sm" withBorder>
                      <Text size="sm" fw={500} mb="xs">选择模型</Text>
                      <Select
                        data={provider.models.map(m => ({
                          value: m.id,
                          label: m.name,
                          description: m.tooltip,
                        }))}
                        value={provider.userConfig.selectedModel || provider.models[0]?.id}
                        onChange={(value) => value && selectModel(provider.id, value)}
                        size="sm"
                      />

                      {/* 模型信息 */}
                      {provider.userConfig.selectedModel && (
                        <Group gap="xs" mt="xs">
                          {(() => {
                            const model = provider.models.find(m => m.id === provider.userConfig.selectedModel);
                            if (!model) return null;
                            return (
                              <>
                                <Badge size="xs" variant="light">
                                  输入: {(model.maxInputTokens / 1000).toFixed(0)}K
                                </Badge>
                                <Badge size="xs" variant="light">
                                  输出: {(model.maxOutputTokens / 1000).toFixed(0)}K
                                </Badge>
                              </>
                            );
                          })()}
                        </Group>
                      )}
                    </Paper>
                  )}

                  {/* 使用统计 */}
                  {stats && (stats.limit.daily || stats.limit.monthly) && (
                    <Paper p="sm" withBorder>
                      <Text size="sm" fw={500} mb="xs">使用统计</Text>
                      {stats.limit.daily && (
                        <Box mb="xs">
                          <Group justify="space-between" mb={4}>
                            <Text size="xs" c="dimmed">今日使用</Text>
                            <Text size="xs">{stats.daily} / {stats.limit.daily}</Text>
                          </Group>
                          <Progress
                            value={(stats.daily / stats.limit.daily) * 100}
                            size="sm"
                            color={stats.daily / stats.limit.daily > 0.8 ? 'red' : 'teal'}
                          />
                        </Box>
                      )}
                      {stats.limit.monthly && (
                        <Box>
                          <Group justify="space-between" mb={4}>
                            <Text size="xs" c="dimmed">本月使用</Text>
                            <Text size="xs">{stats.monthly} / {stats.limit.monthly}</Text>
                          </Group>
                          <Progress
                            value={(stats.monthly / stats.limit.monthly) * 100}
                            size="sm"
                            color={stats.monthly / stats.limit.monthly > 0.8 ? 'red' : 'teal'}
                          />
                        </Box>
                      )}
                    </Paper>
                  )}

                  {/* 设为默认 */}
                  {hasKey && provider.userConfig.enabled && !isActive && (
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => setAsActive(provider.id, provider.userConfig.selectedModel)}
                    >
                      设为默认供应商
                    </Button>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>

      <Text size="xs" c="dimmed" mt="md" ta="center">
        提示：启用多个供应商后，系统会按优先级自动切换
      </Text>
    </Box>
  );
}

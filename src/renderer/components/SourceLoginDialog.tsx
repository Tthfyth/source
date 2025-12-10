/**
 * 书源登录对话框
 * 参考 Legado SourceLoginDialog.kt 实现
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Text,
  Alert,
  Loader,
  ActionIcon,
  Tooltip,
  Divider,
  ScrollArea,
  SimpleGrid,
  Box,
} from '@mantine/core';
import {
  IconLogin,
  IconLogout,
  IconAlertCircle,
  IconCheck,
  IconTrash,
  IconExternalLink,
} from '@tabler/icons-react';

// 登录 UI 配置项类型
interface LoginUiItem {
  name: string;
  type: 'text' | 'password' | 'button';
  action?: string;
}

// 组件属性
interface SourceLoginDialogProps {
  opened: boolean;
  onClose: () => void;
  source: any; // BookSource
  onLoginSuccess?: () => void;
}

export function SourceLoginDialog({
  opened,
  onClose,
  source,
  onLoginSuccess,
}: SourceLoginDialogProps) {
  // 登录 UI 配置
  const [loginUiItems, setLoginUiItems] = useState<LoginUiItem[]>([]);
  // 表单数据
  const [formData, setFormData] = useState<Record<string, string>>({});
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUi, setIsLoadingUi] = useState(false);
  // 错误/成功消息
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 加载登录 UI 配置和已保存的登录信息
  useEffect(() => {
    if (!opened || !source) return;

    const loadLoginUi = async () => {
      setIsLoadingUi(true);
      setMessage(null);

      try {
        // 解析 loginUi
        if (source.loginUi) {
          const result = await window.debugApi?.parseLoginUi(source.loginUi);
          if (result?.success && result.items) {
            setLoginUiItems(result.items as LoginUiItem[]);
          }
        } else {
          // 如果没有 loginUi，创建默认的用户名密码表单
          setLoginUiItems([
            { name: '用户名', type: 'text' },
            { name: '密码', type: 'password' },
          ]);
        }

        // 检查登录状态并加载已保存的登录信息
        const statusResult = await window.debugApi?.checkLoginStatus(source);
        if (statusResult?.success) {
          setIsLoggedIn(statusResult.isLoggedIn ?? false);
          if (statusResult.loginInfo) {
            setFormData(statusResult.loginInfo);
          }
        }
      } catch (error) {
        console.error('Failed to load login UI:', error);
        setMessage({ type: 'error', text: '加载登录配置失败' });
      } finally {
        setIsLoadingUi(false);
      }
    };

    loadLoginUi();
  }, [opened, source]);

  // 更新表单数据
  const updateFormField = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // 执行登录
  const handleLogin = async () => {
    if (!source) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await window.debugApi?.executeLogin(source, formData);
      if (result?.success) {
        setMessage({ type: 'success', text: result.message || '登录成功' });
        setIsLoggedIn(true);
        onLoginSuccess?.();
        // 延迟关闭
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result?.message || '登录失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '登录失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // 执行按钮动作
  const handleButtonAction = async (action?: string) => {
    if (!action || !source) return;

    // 如果是 URL，在浏览器中打开
    if (action.startsWith('http://') || action.startsWith('https://')) {
      window.open(action, '_blank');
      return;
    }

    // 执行 JS
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await window.debugApi?.executeButtonAction(source, action, formData);
      if (result?.success) {
        if (result.result?.type === 'url') {
          window.open(result.result.url, '_blank');
        } else {
          setMessage({ type: 'success', text: '操作成功' });
        }
      } else {
        setMessage({ type: 'error', text: result?.message || '操作失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '操作失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    if (!source) return;

    setIsLoading(true);
    try {
      await window.debugApi?.removeLoginInfo(source.bookSourceUrl);
      await window.debugApi?.removeLoginHeader(source.bookSourceUrl);
      setIsLoggedIn(false);
      setFormData({});
      setMessage({ type: 'success', text: '已退出登录' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '退出失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // 分离输入框和按钮
  const inputItems = loginUiItems.filter(item => item.type === 'text' || item.type === 'password');
  const buttonItems = loginUiItems.filter(item => item.type === 'button');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconLogin size={20} />
          <Text fw={500}>登录 - {source?.bookSourceName || '书源'}</Text>
        </Group>
      }
      size="lg"
    >
      {isLoadingUi ? (
        <Stack align="center" py="xl">
          <Loader size="md" />
          <Text size="sm" c="dimmed">加载登录配置...</Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {/* 登录状态提示 */}
          {isLoggedIn && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              已登录
            </Alert>
          )}

          {/* 消息提示 */}
          {message && (
            <Alert
              icon={message.type === 'error' ? <IconAlertCircle size={16} /> : <IconCheck size={16} />}
              color={message.type === 'error' ? 'red' : 'green'}
              variant="light"
              withCloseButton
              onClose={() => setMessage(null)}
            >
              {message.text}
            </Alert>
          )}

          <ScrollArea.Autosize mah={400}>
            <Stack gap="md">
              {/* 输入框 */}
              {inputItems.map((item, index) => {
                if (item.type === 'text') {
                  return (
                    <TextInput
                      key={`input-${index}`}
                      label={item.name}
                      value={formData[item.name] || ''}
                      onChange={(e) => updateFormField(item.name, e.currentTarget.value)}
                      disabled={isLoading}
                    />
                  );
                }
                if (item.type === 'password') {
                  return (
                    <PasswordInput
                      key={`input-${index}`}
                      label={item.name}
                      value={formData[item.name] || ''}
                      onChange={(e) => updateFormField(item.name, e.currentTarget.value)}
                      disabled={isLoading}
                    />
                  );
                }
                return null;
              })}

              {/* 按钮网格 */}
              {buttonItems.length > 0 && (
                <Box>
                  <Text size="sm" c="dimmed" mb="xs">快捷操作 ({buttonItems.length})</Text>
                  <SimpleGrid cols={2} spacing="xs">
                    {buttonItems.map((item, index) => (
                      <Button
                        key={`btn-${index}`}
                        variant="light"
                        size="xs"
                        onClick={() => handleButtonAction(item.action)}
                        disabled={isLoading}
                        leftSection={item.action?.startsWith('http') ? <IconExternalLink size={14} /> : undefined}
                      >
                        {item.name}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Box>
              )}
            </Stack>
          </ScrollArea.Autosize>

          <Divider />

          {/* 操作按钮 */}
          <Group justify="space-between">
            <Group gap="xs">
              {isLoggedIn && (
                <Tooltip label="退出登录">
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={handleLogout}
                    disabled={isLoading}
                  >
                    <IconLogout size={18} />
                  </ActionIcon>
                </Tooltip>
              )}
              <Tooltip label="清除表单">
                <ActionIcon
                  variant="light"
                  onClick={() => setFormData({})}
                  disabled={isLoading}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Group gap="xs">
              <Button variant="default" onClick={onClose} disabled={isLoading}>
                取消
              </Button>
              <Button
                onClick={handleLogin}
                loading={isLoading}
                leftSection={<IconLogin size={16} />}
              >
                登录
              </Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export default SourceLoginDialog;

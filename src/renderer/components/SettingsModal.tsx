import { useState, useEffect } from 'react';
import appIcon from '../../../assets/icon.png';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Divider,
  Box,
  Loader,
  Badge,
  useMantineColorScheme,
  ThemeIcon,
} from '@mantine/core';
import {
  IconSettings,
  IconRefresh,
  IconDownload,
  IconCheck,
  IconBrandGithub,
  IconHeart,
  IconAlertCircle,
  IconInfoCircle,
  IconExternalLink,
} from '@tabler/icons-react';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  error: string | null;
  version: string | null;
  progress: number;
  checked: boolean; // 是否已检查过
}

export function SettingsModal({ opened, onClose }: SettingsModalProps) {
  const { colorScheme } = useMantineColorScheme();
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    error: null,
    version: null,
    progress: 0,
    checked: false,
  });

  // 获取应用版本
  useEffect(() => {
    if (opened) {
      window.electron?.ipcRenderer?.invoke('app:getVersion').then((version: string) => {
        setAppVersion(version || '0.0.0');
      }).catch(() => {
        setAppVersion('0.0.0');
      });
    }
  }, [opened]);

  // 监听更新状态
  useEffect(() => {
    const handleUpdateStatus = (...args: unknown[]) => {
      const data = args[0] as { status: string; data?: any };
      if (!data || typeof data.status !== 'string') return;
      
      switch (data.status) {
        case 'checking-for-update':
          setUpdateStatus(prev => ({ ...prev, checking: true, error: null }));
          break;
        case 'update-available':
          setUpdateStatus(prev => ({
            ...prev,
            checking: false,
            available: true,
            checked: true,
            version: data.data?.version,
          }));
          break;
        case 'update-not-available':
          setUpdateStatus(prev => ({
            ...prev,
            checking: false,
            available: false,
            checked: true,
            error: null,
          }));
          break;
        case 'download-progress':
          setUpdateStatus(prev => ({
            ...prev,
            downloading: true,
            progress: data.data?.percent || 0,
          }));
          break;
        case 'update-downloaded':
          setUpdateStatus(prev => ({
            ...prev,
            downloading: false,
            downloaded: true,
          }));
          break;
        case 'error':
          setUpdateStatus(prev => ({
            ...prev,
            checking: false,
            downloading: false,
            checked: true,
            error: typeof data.data === 'string' ? data.data : '检查更新失败',
          }));
          break;
      }
    };

    const unsubscribe = window.electron?.ipcRenderer?.on('update-status', handleUpdateStatus);
    return () => {
      unsubscribe?.();
    };
  }, []);

  // 检查更新
  const handleCheckUpdate = async () => {
    setUpdateStatus({
      checking: true,
      available: false,
      downloading: false,
      downloaded: false,
      error: null,
      version: null,
      progress: 0,
      checked: false,
    });

    try {
      await window.electron?.ipcRenderer?.invoke('app:checkForUpdates');
    } catch (error: any) {
      setUpdateStatus(prev => ({
        ...prev,
        checking: false,
        error: error.message || '检查更新失败',
      }));
    }
  };

  // 自动更新（下载更新）
  const handleAutoUpdate = async () => {
    try {
      await window.electron?.ipcRenderer?.invoke('app:downloadUpdate');
    } catch (error: any) {
      setUpdateStatus(prev => ({
        ...prev,
        error: error.message || '下载更新失败',
      }));
    }
  };

  // 重启并安装
  const handleQuitAndInstall = () => {
    window.electron?.ipcRenderer?.invoke('app:quitAndInstall');
  };

  // 打开 GitHub
  const openGitHub = () => {
    window.electron?.ipcRenderer?.invoke('app:openExternal', 'https://github.com/Tthfyth/source');
  };

  // 打开 Release 页面
  const openReleasePage = () => {
    window.electron?.ipcRenderer?.invoke('app:openExternal', 'https://github.com/Tthfyth/source/releases');
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" size="md" radius="md">
            <IconSettings size={18} />
          </ThemeIcon>
          <Text fw={600}>设置</Text>
        </Group>
      }
      size="sm"
      radius="md"
      centered
    >
      <Stack gap="lg">
        {/* 应用信息 */}
        <Box
          p="md"
          style={(theme) => ({
            borderRadius: theme.radius.md,
            background: colorScheme === 'dark' 
              ? 'linear-gradient(135deg, rgba(34, 139, 230, 0.1) 0%, rgba(32, 201, 151, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(34, 139, 230, 0.08) 0%, rgba(32, 201, 151, 0.08) 100%)',
            border: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]}`,
          })}
        >
          <Stack gap="sm" align="center">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              <img 
                src={appIcon} 
                alt="App Icon" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Text size="lg" fw={700}>书源调试器</Text>
            <Text size="sm" c="dimmed">Legado / 异次元 书源调试工具</Text>
            <Badge size="lg" variant="light" color="blue">
              v{appVersion}
            </Badge>
          </Stack>
        </Box>

        <Divider />

        {/* 更新状态 */}
        <Stack gap="sm">
          <Text size="sm" fw={500}>版本更新</Text>

          {/* 检查中 */}
          {updateStatus.checking && (
            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
              })}
            >
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm">正在检查更新...</Text>
              </Group>
            </Box>
          )}

          {/* 发现新版本 */}
          {!updateStatus.checking && updateStatus.available && updateStatus.version && (
            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: colorScheme === 'dark' ? 'rgba(32, 201, 151, 0.1)' : 'rgba(32, 201, 151, 0.1)',
                border: `1px solid ${theme.colors.teal[5]}`,
              })}
            >
              <Stack gap="xs">
                <Group gap="xs">
                  <IconDownload size={18} color="var(--mantine-color-teal-6)" />
                  <Text size="sm" fw={500} c="teal">发现新版本 v{updateStatus.version}</Text>
                </Group>
                <Text size="xs" c="dimmed">可以选择自动更新或手动下载安装</Text>
                <Group gap="xs" mt="xs">
                  <Button
                    size="xs"
                    variant="filled"
                    color="teal"
                    leftSection={updateStatus.downloading ? <Loader size={14} color="white" /> : <IconDownload size={14} />}
                    onClick={handleAutoUpdate}
                    disabled={updateStatus.downloading}
                    style={{ flex: 1 }}
                  >
                    {updateStatus.downloading ? `下载中 ${updateStatus.progress.toFixed(0)}%` : '自动更新'}
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconExternalLink size={14} />}
                    onClick={openReleasePage}
                    style={{ flex: 1 }}
                  >
                    手动下载
                  </Button>
                </Group>
              </Stack>
            </Box>
          )}

          {/* 已是最新版本 */}
          {!updateStatus.checking && updateStatus.checked && !updateStatus.available && !updateStatus.error && !updateStatus.downloaded && (
            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
              })}
            >
              <Group gap="xs">
                <IconCheck size={18} color="var(--mantine-color-green-6)" />
                <Text size="sm" c="green">当前已是最新版本</Text>
              </Group>
            </Box>
          )}

          {/* 检查失败 */}
          {!updateStatus.checking && updateStatus.error && (
            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: colorScheme === 'dark' ? 'rgba(250, 82, 82, 0.1)' : 'rgba(250, 82, 82, 0.1)',
                border: `1px solid ${theme.colors.red[5]}`,
              })}
            >
              <Stack gap="xs">
                <Group gap="xs">
                  <IconAlertCircle size={18} color="var(--mantine-color-red-6)" />
                  <Text size="sm" c="red">检查更新失败</Text>
                </Group>
                <Text size="xs" c="dimmed">{updateStatus.error}</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconExternalLink size={14} />}
                  onClick={openReleasePage}
                  mt="xs"
                >
                  前往 GitHub 查看最新版本
                </Button>
              </Stack>
            </Box>
          )}

          {/* 更新已下载 */}
          {updateStatus.downloaded && (
            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: colorScheme === 'dark' ? 'rgba(32, 201, 151, 0.1)' : 'rgba(32, 201, 151, 0.1)',
                border: `1px solid ${theme.colors.teal[5]}`,
              })}
            >
              <Stack gap="xs">
                <Group gap="xs">
                  <IconCheck size={18} color="var(--mantine-color-teal-6)" />
                  <Text size="sm" fw={500} c="teal">更新已下载完成</Text>
                </Group>
                <Text size="xs" c="dimmed">重启应用后将自动安装更新</Text>
                <Button
                  size="xs"
                  variant="filled"
                  color="teal"
                  onClick={handleQuitAndInstall}
                  mt="xs"
                >
                  立即重启并安装
                </Button>
              </Stack>
            </Box>
          )}

          {/* 未检查状态 */}
          {!updateStatus.checking && !updateStatus.checked && !updateStatus.downloaded && (
            <Box
              p="sm"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
              })}
            >
              <Group gap="xs">
                <IconInfoCircle size={18} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">点击下方按钮检查更新</Text>
              </Group>
            </Box>
          )}
        </Stack>

        {/* 操作按钮 */}
        <Stack gap="xs">
          <Button
            variant="light"
            leftSection={updateStatus.checking ? <Loader size={16} /> : <IconRefresh size={16} />}
            onClick={handleCheckUpdate}
            disabled={updateStatus.checking || updateStatus.downloading}
            fullWidth
          >
            {updateStatus.checking ? '检查中...' : '检查更新'}
          </Button>

          <Button
            variant="subtle"
            leftSection={<IconBrandGithub size={16} />}
            onClick={openGitHub}
            fullWidth
            color="gray"
          >
            GitHub 仓库
          </Button>
        </Stack>

        <Divider />

        {/* 底部信息 */}
        <Group justify="center" gap={4}>
          <Text size="xs" c="dimmed">Made with</Text>
          <IconHeart size={12} color="var(--mantine-color-red-5)" />
          <Text size="xs" c="dimmed">by Tthfyth</Text>
        </Group>
      </Stack>
    </Modal>
  );
}

export default SettingsModal;

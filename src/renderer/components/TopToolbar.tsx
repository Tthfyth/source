import {
  Group,
  ActionIcon,
  Button,
  Text,
  Tooltip,
  Divider,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconFolderOpen,
  IconDeviceFloppy,
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconLayoutSidebar,
  IconTerminal,
  IconCode,
  IconSun,
  IconMoon,
  IconTrash,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';

interface TopToolbarProps {
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  isBottomCollapsed: boolean;
  isAICollapsed: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleBottom: () => void;
  onToggleAI: () => void;
}

export function TopToolbar({
  isLeftCollapsed,
  isRightCollapsed,
  isBottomCollapsed,
  isAICollapsed,
  onToggleLeft,
  onToggleRight,
  onToggleBottom,
  onToggleAI,
}: TopToolbarProps) {
  const {
    sources,
    activeSourceId,
    isModified,
    loadedFilePath,
    createSource,
    importSources,
    saveCurrentSource,
    saveToFile,
    clearAllSources,
  } = useBookSourceStore();

  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const activeSource = sources.find(
    (s) => s.bookSourceUrl === activeSourceId
  );

  // 新建书源
  const handleCreate = () => {
    createSource();
  };

  // 导入书源
  const handleImport = async () => {
    // 使用 Electron dialog 选择文件，可以获取完整路径
    if (window.fileApi) {
      const result = await window.fileApi.openFile();
      if (result.canceled) return;
      if (!result.success || !result.content) {
        notifications.show({
          title: '导入失败',
          message: result.error || '无法读取文件',
          color: 'red',
        });
        return;
      }
      
      const count = importSources(result.content, result.filePath);
      if (count > 0) {
        notifications.show({
          title: '导入成功',
          message: `成功导入 ${count} 个书源\n文件: ${result.filePath}`,
          color: 'teal',
        });
      } else {
        notifications.show({
          title: '导入失败',
          message: '请检查文件格式',
          color: 'red',
        });
      }
    } else {
      // 降级方案：使用 input 元素（无法获取完整路径）
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          const count = importSources(text);
          if (count > 0) {
            notifications.show({
              title: '导入成功',
              message: `成功导入 ${count} 个书源`,
              color: 'teal',
            });
          } else {
            notifications.show({
              title: '导入失败',
              message: '请检查文件格式',
              color: 'red',
            });
          }
        }
        input.remove();
      };
      input.click();
    }
  };

  // 保存书源（内存 + 文件）
  const handleSave = async () => {
    if (saveCurrentSource()) {
      // 如果有导入的文件路径，同步保存到文件
      if (loadedFilePath) {
        const fileResult = await saveToFile();
        if (fileResult) {
          notifications.show({
            title: '保存成功',
            message: `书源已保存到: ${loadedFilePath}`,
            color: 'teal',
          });
        } else {
          notifications.show({
            title: '内存保存成功',
            message: '但文件保存失败，请检查文件权限',
            color: 'yellow',
          });
        }
      } else {
        notifications.show({
          title: '保存成功',
          message: '书源已保存到内存',
          color: 'teal',
        });
      }
    } else {
      notifications.show({
        title: '保存失败',
        message: '请检查JSON格式',
        color: 'red',
      });
    }
  };

  // 清空书源
  const handleClear = () => {
    if (sources.length === 0) {
      notifications.show({
        message: '书源列表已为空',
        color: 'blue',
      });
      return;
    }
    if (window.confirm(`确定要清空所有 ${sources.length} 个书源吗？此操作不可恢复！`)) {
      clearAllSources();
      notifications.show({
        title: '已清空',
        message: '所有书源已清空',
        color: 'teal',
      });
    }
  };

  return (
    <Group
      h={48}
      px="sm"
      justify="space-between"
      style={(theme) => ({
        borderBottom: `1px solid ${
          colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
        }`,
        backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
      })}
    >
      {/* 左侧操作按钮 */}
      <Group gap="xs">
        <Tooltip label="切换书源列表 (Ctrl+B)" position="bottom">
          <ActionIcon
            variant={isLeftCollapsed ? 'subtle' : 'light'}
            size="lg"
            onClick={onToggleLeft}
          >
            <IconLayoutSidebar size={18} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" mx={4} />

        <Group gap={4}>
          <Tooltip label="新建书源" position="bottom">
            <ActionIcon variant="subtle" size="lg" onClick={handleCreate}>
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="导入书源" position="bottom">
            <ActionIcon variant="subtle" size="lg" onClick={handleImport}>
              <IconFolderOpen size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="清空书源" position="bottom">
            <ActionIcon
              variant="subtle"
              size="lg"
              color="red"
              onClick={handleClear}
              disabled={sources.length === 0}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="保存 (Ctrl+S)" position="bottom">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={handleSave}
              disabled={!isModified}
            >
              <IconDeviceFloppy size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider orientation="vertical" mx={4} />

        <Tooltip label="测试所有书源" position="bottom">
          <ActionIcon variant="subtle" size="lg">
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* 中间标题 */}
      <Group gap="xs">
        <Text fw={600} size="sm">Legado 书源调试器</Text>
        {activeSource && (
          <>
            <Text c="dimmed" size="sm">-</Text>
            <Text c="dimmed" size="sm">{activeSource.bookSourceName}</Text>
            {isModified && (
              <Text c="teal" size="sm">●</Text>
            )}
          </>
        )}
      </Group>

      {/* 右侧操作按钮 */}
      <Group gap="xs">
        <Tooltip label="切换AI助手面板" position="bottom">
          <Button
            variant={isAICollapsed ? 'subtle' : 'light'}
            size="xs"
            leftSection={<IconSparkles size={16} />}
            onClick={onToggleAI}
          >
            AI识别
          </Button>
        </Tooltip>

        <Divider orientation="vertical" mx={4} />

        <Tooltip label="切换控制台 (Ctrl+`)" position="bottom">
          <ActionIcon
            variant={isBottomCollapsed ? 'subtle' : 'light'}
            size="lg"
            onClick={onToggleBottom}
          >
            <IconTerminal size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="切换调试面板 (Ctrl+Shift+D)" position="bottom">
          <ActionIcon
            variant={isRightCollapsed ? 'subtle' : 'light'}
            size="lg"
            onClick={onToggleRight}
          >
            <IconCode size={18} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={colorScheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'} position="bottom">
          <ActionIcon variant="subtle" size="lg" onClick={() => toggleColorScheme()}>
            {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="设置" position="bottom">
          <ActionIcon variant="subtle" size="lg">
            <IconSettings size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

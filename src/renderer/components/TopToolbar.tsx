import { useState } from 'react';
import {
  Group,
  ActionIcon,
  Button,
  Text,
  Tooltip,
  Divider,
  Menu,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconFolderOpen,
  IconDeviceFloppy,
  IconTransform,
  IconSettings,
  IconSparkles,
  IconLayoutSidebar,
  IconTerminal,
  IconCode,
  IconSun,
  IconMoon,
  IconTrash,
  IconChevronDown,
  IconHelp,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { SourceFormat, detectSourceFormat, getSourceFormatLabel } from '../types';
import { useAppTour } from './AppTour';
import { convertSource } from '../utils/sourceConverter';

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
  const { resetTour } = useAppTour();

  const activeSource = sources.find(
    (s) => s.bookSourceUrl === activeSourceId
  );

  // 新建书源
  const handleCreateLegado = () => {
    createSource(SourceFormat.Legado);
    notifications.show({
      message: '已创建 Legado 书源',
      color: 'blue',
    });
  };

  const handleCreateYiciyuan = () => {
    createSource(SourceFormat.Yiciyuan);
    notifications.show({
      message: '已创建异次元图源',
      color: 'grape',
    });
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

  // 图源转换（仅支持图片类型）
  const handleConvertSource = () => {
    if (!activeSource) {
      notifications.show({
        message: '请先选择一个书源',
        color: 'yellow',
      });
      return;
    }

    const convertResult = convertSource(activeSource);
    
    // 检查转换是否成功
    if (!convertResult.success) {
      notifications.show({
        title: '无法转换',
        message: convertResult.error || '转换失败',
        color: 'red',
      });
      return;
    }
    
    // 更新源代码并保存到列表
    const newCode = JSON.stringify(convertResult.result, null, 2);
    const store = useBookSourceStore.getState();
    store.updateSourceCode(newCode);
    store.saveCurrentSource(); // 保存到列表，触发类型更新
    
    const fromLabel = convertResult.fromFormat === SourceFormat.Yiciyuan ? '异次元' : 'Legado';
    const toLabel = convertResult.toFormat === SourceFormat.Yiciyuan ? '异次元' : 'Legado';
    
    notifications.show({
      title: '转换成功',
      message: `已将 ${fromLabel} 图源转换为 ${toLabel} 格式`,
      color: 'teal',
    });
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
          {/* 新建书源下拉菜单 */}
          <Menu position="bottom-start" withinPortal>
            <Menu.Target>
              <Tooltip label="新建书源" position="bottom">
                <ActionIcon variant="subtle" size="lg">
                  <Group gap={2}>
                    <IconPlus size={18} />
                    <IconChevronDown size={12} />
                  </Group>
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>选择书源格式</Menu.Label>
              <Menu.Item onClick={handleCreateLegado}>
                <Group gap="xs">
                  <Text size="sm" c="blue">Legado 书源</Text>
                  <Text size="xs" c="dimmed">（文本/图片/音频）</Text>
                </Group>
              </Menu.Item>
              <Menu.Item onClick={handleCreateYiciyuan}>
                <Group gap="xs">
                  <Text size="sm" c="grape">异次元图源</Text>
                  <Text size="xs" c="dimmed">（漫画专用）</Text>
                </Group>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

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
              data-tour="save-btn"
            >
              <IconDeviceFloppy size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider orientation="vertical" mx={4} />

        <Tooltip label="图源转换 (异次元 ↔ Legado)" position="bottom">
          <ActionIcon 
            variant="subtle" 
            size="lg" 
            onClick={handleConvertSource}
            disabled={!activeSource}
            data-tour="convert-btn"
          >
            <IconTransform size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* 中间标题 */}
      <Group gap="xs">
        <Text fw={600} size="sm">书源调试器</Text>
        {activeSource && (
          <>
            <Text c="dimmed" size="sm">-</Text>
            {/* 显示源格式标签 */}
            {(() => {
              const format = detectSourceFormat(activeSource);
              const isYiciyuan = format === SourceFormat.Yiciyuan;
              return (
                <Text size="sm" c={isYiciyuan ? 'grape' : 'blue'} fw={500}>
                  [{isYiciyuan ? '异次元' : 'Legado'}]
                </Text>
              );
            })()}
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
            data-tour="ai-toggle"
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

        <Tooltip label="使用帮助" position="bottom">
          <ActionIcon variant="subtle" size="lg" onClick={resetTour}>
            <IconHelp size={18} />
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

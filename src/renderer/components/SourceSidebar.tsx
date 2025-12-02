import { useState, useMemo } from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  TextInput,
  Button,
  ActionIcon,
  Badge,
  ScrollArea,
  Menu,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconPlus,
  IconFolderOpen,
  IconDeviceFloppy,
  IconDotsVertical,
  IconTrash,
  IconCopy,
  IconDownload,
  IconCircleCheck,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';

export function SourceSidebar() {
  const {
    sources,
    activeSourceId,
    selectSource,
    createSource,
    importSources,
    deleteSource,
  } = useBookSourceStore();

  const { colorScheme } = useMantineColorScheme();
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤后的书源列表
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) {
      return sources;
    }
    const query = searchQuery.toLowerCase();
    return sources.filter(
      (s) =>
        (s.bookSourceName || '').toLowerCase().includes(query) ||
        (s.bookSourceUrl || '').toLowerCase().includes(query)
    );
  }, [sources, searchQuery]);

  // 新建书源
  const handleCreate = () => {
    createSource();
  };

  // 导入书源
  const handleImport = () => {
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
    };
    input.click();
  };

  // 复制书源
  const handleCopy = (url: string) => {
    const source = sources.find((s) => s.bookSourceUrl === url);
    if (source) {
      navigator.clipboard.writeText(JSON.stringify(source, null, 2));
      notifications.show({
        message: '已复制到剪贴板',
        color: 'teal',
      });
    }
  };

  // 导出书源
  const handleExport = (url: string) => {
    const source = sources.find((s) => s.bookSourceUrl === url);
    if (source) {
      const blob = new Blob([JSON.stringify(source, null, 2)], {
        type: 'application/json',
      });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${source.bookSourceName || 'source'}.json`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    }
  };

  // 删除书源
  const handleDelete = (url: string) => {
    if (confirm('确定要删除这个书源吗？此操作不可恢复。')) {
      deleteSource(url);
      notifications.show({
        message: '书源已删除',
        color: 'teal',
      });
    }
  };

  return (
    <Box
      h="100%"
      style={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
      })}
    >
      {/* 标题 */}
      <Group
        px="sm"
        py="xs"
        justify="space-between"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        })}
      >
        <Text size="sm" fw={600}>书源管理</Text>
        <Badge size="sm" variant="light">{sources.length}</Badge>
      </Group>

      {/* 搜索框 */}
      <Box
        p="sm"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        })}
      >
        <TextInput
          placeholder="过滤书源名称或URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="xs"
        />
      </Box>

      {/* 书源列表 */}
      <ScrollArea style={{ flex: 1 }}>
        <Box p="xs">
          {filteredSources.length > 0 ? (
            <Stack gap={4}>
              {filteredSources.map((source) => (
                <Group
                  key={source.bookSourceUrl}
                  px="sm"
                  py="xs"
                  gap="xs"
                  wrap="nowrap"
                  style={(theme) => ({
                    cursor: 'pointer',
                    borderRadius: theme.radius.sm,
                    backgroundColor:
                      activeSourceId === source.bookSourceUrl
                        ? colorScheme === 'dark'
                          ? theme.colors.teal[9] + '20'
                          : theme.colors.teal[0]
                        : 'transparent',
                    '&:hover': {
                      backgroundColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0],
                    },
                  })}
                  onClick={() => selectSource(source.bookSourceUrl)}
                >
                  <Box
                    w={8}
                    h={8}
                    style={(theme) => ({
                      flexShrink: 0,
                      borderRadius: '50%',
                      backgroundColor: source.enabled ? theme.colors.green[6] : theme.colors.red[6],
                    })}
                  />
                  <Text
                    size="sm"
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    c={activeSourceId === source.bookSourceUrl ? 'teal' : undefined}
                  >
                    {source.bookSourceName || '未命名书源'}
                  </Text>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        style={{ opacity: 0.5 }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                      >
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={() => handleCopy(source.bookSourceUrl)}
                      >
                        复制书源
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconDownload size={14} />}
                        onClick={() => handleExport(source.bookSourceUrl)}
                      >
                        导出书源
                      </Menu.Item>
                      <Menu.Item leftSection={<IconCircleCheck size={14} />}>
                        在线验证
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleDelete(source.bookSourceUrl)}
                      >
                        删除书源
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              ))}
            </Stack>
          ) : (
            <Box py="xl" ta="center">
              <Text size="sm" c="dimmed" mb="md">暂无书源</Text>
              <Button size="xs" onClick={handleCreate}>创建书源</Button>
            </Box>
          )}
        </Box>
      </ScrollArea>

      {/* 底部工具栏 */}
      <Group
        p="sm"
        justify="space-between"
        style={(theme) => ({
          borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        })}
      >
        <Group gap="xs">
          <Tooltip label="新建书源">
            <ActionIcon variant="subtle" onClick={handleCreate}>
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="导入书源">
            <ActionIcon variant="subtle" onClick={handleImport}>
              <IconFolderOpen size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Button size="xs" leftSection={<IconDeviceFloppy size={14} />}>
          全部保存
        </Button>
      </Group>
    </Box>
  );
}

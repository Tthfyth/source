import { useRef, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Group,
  Text,
  TextInput,
  ActionIcon,
  Badge,
  ScrollArea,
  Paper,
  Collapse,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconTrash,
  IconDownload,
  IconCopy,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import type { LogCategory, DebugLog } from '../types';

const categoryLabels: Record<LogCategory, string> = {
  request: '请求',
  parse: '解析',
  field: '字段',
  error: '错误',
};

const categoryColors: Record<LogCategory, string> = {
  request: 'blue',
  parse: 'green',
  field: 'violet',
  error: 'red',
};

export function DebugConsole() {
  const { debugLogs, logFilters, setLogFilters, clearLogs } = useBookSourceStore();
  const { colorScheme } = useMantineColorScheme();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // 过滤后的日志
  const filteredLogs = useMemo(() => {
    let logs = debugLogs.filter((log) => logFilters.includes(log.category));
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query)
      );
    }
    
    return logs;
  }, [debugLogs, logFilters, searchQuery]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  // 格式化时间
  const formatTime = (date: Date): string => {
    return (
      date.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) +
      '.' +
      date.getMilliseconds().toString().padStart(3, '0')
    );
  };

  // 切换过滤器
  const toggleFilter = (category: LogCategory) => {
    if (logFilters.includes(category)) {
      setLogFilters(logFilters.filter((f) => f !== category));
    } else {
      setLogFilters([...logFilters, category]);
    }
  };

  // 复制日志
  const copyLogs = () => {
    const text = filteredLogs
      .map((log) => `[${formatTime(log.timestamp)}] [${log.category}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  // 导出日志
  const exportLogs = () => {
    const text = filteredLogs
      .map((log) =>
        JSON.stringify({
          time: log.timestamp.toISOString(),
          level: log.level,
          category: log.category,
          message: log.message,
          details: log.details,
        })
      )
      .join('\n');

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取日志级别样式
  const getLogLevelBg = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return colorScheme === 'dark' ? 'rgba(250, 82, 82, 0.1)' : 'rgba(250, 82, 82, 0.1)';
      case 'warning':
        return colorScheme === 'dark' ? 'rgba(250, 176, 5, 0.1)' : 'rgba(250, 176, 5, 0.1)';
      case 'success':
        return colorScheme === 'dark' ? 'rgba(64, 192, 87, 0.05)' : 'rgba(64, 192, 87, 0.05)';
      default:
        return 'transparent';
    }
  };

  return (
    <Box
      h="100%"
      style={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
      })}
    >
      {/* 控制台头部 */}
      <Group
        px="sm"
        py="xs"
        justify="space-between"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        })}
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>调试日志</Text>
          <Badge size="sm" variant="outline" style={{ fontFamily: 'monospace' }}>
            {filteredLogs.length}/{debugLogs.length}
          </Badge>
        </Group>

        <Group gap="xs">
          {/* 搜索框 */}
          {showSearch ? (
            <Group gap={4}>
              <TextInput
                placeholder="搜索日志..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="xs"
                w={160}
                leftSection={<IconSearch size={14} />}
                rightSection={
                  searchQuery && (
                    <ActionIcon variant="subtle" size="xs" onClick={() => setSearchQuery('')}>
                      <IconX size={12} />
                    </ActionIcon>
                  )
                }
                autoFocus
              />
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <ActionIcon variant="subtle" size="sm" onClick={() => setShowSearch(true)}>
              <IconSearch size={16} />
            </ActionIcon>
          )}

          <Box w={1} h={16} bg={colorScheme === 'dark' ? 'dark.4' : 'gray.3'} />

          {/* 过滤器 */}
          <Group gap={4}>
            {(Object.keys(categoryLabels) as LogCategory[]).map((category) => (
              <Badge
                key={category}
                size="xs"
                variant={logFilters.includes(category) ? 'filled' : 'light'}
                color={logFilters.includes(category) ? categoryColors[category] : 'gray'}
                style={{ cursor: 'pointer' }}
                onClick={() => toggleFilter(category)}
              >
                {categoryLabels[category]}
              </Badge>
            ))}
          </Group>

          <Box w={1} h={16} bg={colorScheme === 'dark' ? 'dark.4' : 'gray.3'} />

          {/* 操作按钮 */}
          <ActionIcon variant="subtle" size="sm" onClick={copyLogs} disabled={!filteredLogs.length} title="复制日志">
            <IconCopy size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="sm" onClick={exportLogs} disabled={!filteredLogs.length} title="导出日志">
            <IconDownload size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="sm" onClick={clearLogs} disabled={!debugLogs.length} title="清空日志">
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {/* 日志内容 */}
      <ScrollArea style={{ flex: 1 }} viewportRef={scrollRef}>
        <Box p="xs" style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {filteredLogs.length > 0 ? (
            <Box>
              {filteredLogs.map((log) => (
                <Box
                  key={log.id}
                  px="xs"
                  py={4}
                  style={{
                    borderRadius: 4,
                    backgroundColor: getLogLevelBg(log.level),
                    cursor: log.details ? 'pointer' : 'default',
                  }}
                  onClick={() => log.details && setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {formatTime(log.timestamp)}
                    </Text>
                    <Badge
                      size="xs"
                      color={categoryColors[log.category]}
                      variant="filled"
                      style={{ flexShrink: 0 }}
                    >
                      {categoryLabels[log.category]}
                    </Badge>
                    <Text size="xs" style={{ flex: 1, wordBreak: 'break-all' }}>
                      {log.message}
                    </Text>
                    {log.details && (
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {expandedLogId === log.id ? '▼' : '▶'}
                      </Text>
                    )}
                  </Group>

                  {/* 详情展开 */}
                  <Collapse in={expandedLogId === log.id && !!log.details}>
                    <Paper
                      p="xs"
                      mt="xs"
                      bg={colorScheme === 'dark' ? 'dark.6' : 'gray.0'}
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                    >
                      <Text size="xs" c="dimmed">{log.details}</Text>
                    </Paper>
                  </Collapse>
                </Box>
              ))}
            </Box>
          ) : (
            <Box py="xl" ta="center">
              <Text size="sm" c="dimmed">执行测试后将在此显示调试信息</Text>
            </Box>
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
}

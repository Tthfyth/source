import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  TextInput,
  Button,
  ActionIcon,
  Badge,
  Tabs,
  ScrollArea,
  Paper,
  Collapse,
  Switch,
  Divider,
  Image,
  Loader,
  SegmentedControl,
  Tooltip,
  Modal,
  Select,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconMinus,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconChevronRight,
  IconChevronDown,
  IconBook,
  IconList,
  IconFileText,
  IconPhoto,
  IconSparkles,
  IconHistory,
  IconWorld,
  IconRefresh,
  IconCopy,
  IconCompass,
  IconBolt,
  IconInfoCircle,
  IconAlertCircle,
  IconChevronLeft,
  IconX,
  IconLayoutRows,
  IconLayoutColumns,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconSearch,
  IconCode,
  IconLogin,
  IconUser,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import type { BookItem, ChapterItem, TestMode } from '../types';
import { SourceLoginDialog } from './SourceLoginDialog';

const testModeOptions: { label: string; value: TestMode }[] = [
  { label: '搜索', value: 'search' },
  { label: '发现', value: 'explore' },
  { label: '详情', value: 'detail' },
  { label: '目录', value: 'toc' },
  { label: '正文', value: 'content' },
];

export function DebugPanel() {
  const {
    testMode,
    setTestMode,
    testInput,
    setTestInput,
    testHistory,
    isLoading,
    testResult,
    runTest,
    runTestWithParams,
    requestHeaders,
    addRequestHeader,
    removeRequestHeader,
    updateRequestHeader,
    aiAnalysisEnabled,
    setAiAnalysisEnabled,
    chapterList,
    currentChapterIndex,
    sources,
    activeSourceId,
    sourceCode,
  } = useBookSourceStore();

  // 发现分类状态（支持 JS 动态规则，需要后端解析）
  const [exploreCategories, setExploreCategories] = useState<
    Array<{ label: string; value: string }> | Array<{ group: string; items: { label: string; value: string }[] }>
  >([]);
  const [exploreCategoryCount, setExploreCategoryCount] = useState(0);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // 解析发现分类列表（支持 JS 动态规则）
  useEffect(() => {
    const parseCategories = async () => {
      // 获取当前书源
      let currentSource: any = null;
      try {
        if (sourceCode) {
          currentSource = JSON.parse(sourceCode);
        }
      } catch {
        currentSource = sources.find(s => s.bookSourceUrl === activeSourceId);
      }

      if (!currentSource) {
        setExploreCategories([]);
        setExploreCategoryCount(0);
        return;
      }

      const exploreUrl = currentSource.exploreUrl || currentSource.ruleFindUrl || '';
      if (!exploreUrl) {
        setExploreCategories([]);
        setExploreCategoryCount(0);
        return;
      }

      // 检查是否是 JS 动态规则
      const isJsRule = exploreUrl.trim().startsWith('<js>') || 
                       exploreUrl.trim().toLowerCase().startsWith('@js:');

      if (isJsRule) {
        // JS 动态规则，调用后端 API 解析
        setIsLoadingCategories(true);
        try {
          const result = await window.debugApi?.parseExploreCategories(currentSource);
          if (result?.success && result?.categories) {
            // 去重：使用 Set 记录已出现的 value
            const seenValues = new Set<string>();
            const items = result.categories
              .map((cat: any) => ({
                label: cat.title,
                value: `${cat.title}::${cat.url}`,
                group: cat.group || '默认',
              }))
              .filter((item: { label: string; value: string; group: string }) => {
                if (seenValues.has(item.value)) {
                  return false;
                }
                seenValues.add(item.value);
                return true;
              });
            
            // 转换为 Mantine Select 格式
            const formatted = formatCategoriesToSelect(items);
            setExploreCategories(formatted.data);
            setExploreCategoryCount(formatted.count);
          } else {
            setExploreCategories([]);
            setExploreCategoryCount(0);
          }
        } catch (error) {
          console.error('Failed to parse explore categories:', error);
          setExploreCategories([]);
          setExploreCategoryCount(0);
        } finally {
          setIsLoadingCategories(false);
        }
      } else {
        // 静态规则，前端直接解析
        const items: { label: string; value: string; group: string }[] = [];
        let currentGroup = '默认';

        // 尝试 JSON 格式
        if (exploreUrl.trim().startsWith('[')) {
          try {
            const jsonData = JSON.parse(exploreUrl);
            if (Array.isArray(jsonData)) {
              jsonData.forEach((item: any) => {
                if (item.title) {
                  if (item.url) {
                    items.push({ 
                      label: item.title, 
                      value: `${item.title}::${item.url}`,
                      group: currentGroup
                    });
                  } else {
                    currentGroup = item.title;
                  }
                }
              });
            }
          } catch {
            // 不是有效 JSON
          }
        }

        // 文本格式解析
        if (items.length === 0) {
          currentGroup = '默认';
          const lines = exploreUrl.split(/&&|\n/).filter((l: string) => l.trim());
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('::')) {
              const separatorIndex = trimmed.indexOf('::');
              const name = trimmed.substring(0, separatorIndex).trim();
              const url = trimmed.substring(separatorIndex + 2).trim();
              if (name && url) {
                items.push({ label: name, value: trimmed, group: currentGroup });
              } else if (name && !url) {
                currentGroup = name;
              }
            } else if (trimmed.startsWith('http')) {
              items.push({ label: trimmed, value: trimmed, group: currentGroup });
            } else if (trimmed) {
              currentGroup = trimmed;
            }
          }
        }

        const formatted = formatCategoriesToSelect(items);
        setExploreCategories(formatted.data);
        setExploreCategoryCount(formatted.count);
      }
    };

    parseCategories();
  }, [sourceCode, sources, activeSourceId]);

  // 辅助函数：转换分类为 Mantine Select 格式
  const formatCategoriesToSelect = (items: { label: string; value: string; group: string }[]) => {
    const groupMap = new Map<string, { label: string; value: string }[]>();
    for (const item of items) {
      if (!groupMap.has(item.group)) {
        groupMap.set(item.group, []);
      }
      groupMap.get(item.group)!.push({ label: item.label, value: item.value });
    }

    const count = items.length;

    // 如果只有一个分组且是默认分组，返回扁平数组
    if (groupMap.size === 1 && groupMap.has('默认')) {
      return { data: groupMap.get('默认')!, count };
    }

    // 返回分组格式
    const result: Array<{ group: string; items: { label: string; value: string }[] }> = [];
    for (const [group, groupItems] of groupMap) {
      result.push({ group, items: groupItems });
    }
    return { data: result, count };
  };

  const { colorScheme } = useMantineColorScheme();
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<string | null>('visual');
  
  // 图片查看器状态
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal'); // 横向翻页 / 纵向条漫

  // 原始响应搜索和格式化状态
  const [rawSearchKeyword, setRawSearchKeyword] = useState('');
  const [isRawFormatted, setIsRawFormatted] = useState(false);

  // 登录对话框状态
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState<{
    hasLoginUrl: boolean;
    isLoggedIn: boolean;
  }>({ hasLoginUrl: false, isLoggedIn: false });

  // 获取当前书源对象
  const currentSource = useMemo(() => {
    try {
      if (sourceCode) {
        return JSON.parse(sourceCode);
      }
    } catch {
      // ignore
    }
    return sources.find(s => s.bookSourceUrl === activeSourceId);
  }, [sourceCode, sources, activeSourceId]);

  // 检查登录状态
  useEffect(() => {
    const checkLogin = async () => {
      if (!currentSource) {
        setLoginStatus({ hasLoginUrl: false, isLoggedIn: false });
        return;
      }
      
      try {
        const result = await window.debugApi?.checkLoginStatus(currentSource);
        if (result?.success) {
          setLoginStatus({
            hasLoginUrl: result.hasLoginUrl ?? false,
            isLoggedIn: result.isLoggedIn ?? false,
          });
        }
      } catch {
        // ignore
      }
    };
    
    checkLogin();
  }, [currentSource]);

  // 可视化数据
  const visualData = useMemo(() => {
    if (!testResult?.rawParsedItems) return { books: [], chapters: [], content: '', bookDetail: null, imageUrls: [] };

    const items = testResult.rawParsedItems;

    if (testMode === 'search' || testMode === 'explore') {
      const books: BookItem[] = Array.isArray(items)
        ? items.map((item: any) => ({
            name: item.name || item.bookName || '',
            author: item.author || '',
            intro: item.intro || item.description || '',
            coverUrl: item.coverUrl || item.cover || '',
            bookUrl: item.bookUrl || item.url || '',
            kind: item.kind || item.category || '',
            lastChapter: item.lastChapter || '',
            wordCount: item.wordCount || '',
          })).filter((book: BookItem) => book.name)
        : [];
      return { books, chapters: [], content: '', bookDetail: null, imageUrls: [] };
    }

    if (testMode === 'detail') {
      const item = Array.isArray(items) ? items[0] : items;
      if (item) {
        const bookDetail = {
          name: item.name || item.bookName || '',
          author: item.author || '',
          intro: item.intro || item.description || '',
          coverUrl: item.coverUrl || item.cover || '',
          tocUrl: item.tocUrl || item.catalogUrl || '',
          kind: item.kind || item.category || '',
          lastChapter: item.lastChapter || '',
          wordCount: item.wordCount || '',
          updateTime: item.updateTime || '',
        };
        return { books: [], chapters: [], content: '', bookDetail, imageUrls: [] };
      }
      return { books: [], chapters: [], content: '', bookDetail: null, imageUrls: [] };
    }

    if (testMode === 'toc') {
      const chapters: ChapterItem[] = Array.isArray(items)
        ? items.map((item: any, index: number) => ({
            name: item.chapterName || item.name || item.title || `第${index + 1}章`,
            url: item.chapterUrl || item.url || item.href || '',
          })).filter((ch: ChapterItem) => ch.name)  // 只要有名称就显示，url 可以为空
        : [];
      return { books: [], chapters, content: '', bookDetail: null, imageUrls: [] };
    }

    if (testMode === 'content') {
      let content = '';
      let imageUrls: string[] = [];
      
      if (testResult.imageUrls && Array.isArray(testResult.imageUrls)) {
        imageUrls = testResult.imageUrls;
      } else if (Array.isArray(items)) {
        const allImages = items.every((item: any) => 
          typeof item === 'string' && 
          /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(item)
        );
        if (allImages) {
          imageUrls = items as string[];
        } else {
          content = items.join('\n');
        }
      } else if (typeof items === 'string') {
        content = items;
      } else if (items && typeof items === 'object' && 'content' in items) {
        content = (items as { content: string }).content;
      }
      
      return { books: [], chapters: [], content, imageUrls, bookDetail: null };
    }

    return { books: [], chapters: [], content: '', imageUrls: [], bookDetail: null };
  }, [testResult, testMode]);

  // 图片查看器键盘快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!imageViewerOpen) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      setCurrentImageIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      setCurrentImageIndex(prev => Math.min((visualData.imageUrls?.length || 1) - 1, prev + 1));
    } else if (e.key === 'Escape') {
      setImageViewerOpen(false);
    }
  }, [imageViewerOpen, visualData.imageUrls?.length]);

  // 图片查看器鼠标滚轮（仅横向模式）
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!imageViewerOpen || viewMode === 'vertical') return;
    
    e.preventDefault();
    if (e.deltaY > 0) {
      // 向下滚动 -> 下一张
      setCurrentImageIndex(prev => Math.min((visualData.imageUrls?.length || 1) - 1, prev + 1));
    } else if (e.deltaY < 0) {
      // 向上滚动 -> 上一张
      setCurrentImageIndex(prev => Math.max(0, prev - 1));
    }
  }, [imageViewerOpen, viewMode, visualData.imageUrls?.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (imageViewerOpen && viewMode === 'horizontal') {
      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => window.removeEventListener('wheel', handleWheel);
    }
  }, [imageViewerOpen, viewMode, handleWheel]);

  const handleTest = async () => {
    if (!testInput.trim()) {
      return;
    }
    await runTest();
  };

  // 上一章/下一章
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapterList.length - 1;
  const currentChapterName = currentChapterIndex >= 0 && currentChapterIndex < chapterList.length 
    ? chapterList[currentChapterIndex].name 
    : '';

  const handlePrevChapter = async () => {
    if (hasPrevChapter) {
      const prevChapter = chapterList[currentChapterIndex - 1];
      await runTestWithParams('content', prevChapter.url);
      setCurrentImageIndex(0);
    }
  };

  const handleNextChapter = async () => {
    if (hasNextChapter) {
      const nextChapter = chapterList[currentChapterIndex + 1];
      await runTestWithParams('content', nextChapter.url);
      setCurrentImageIndex(0);
    }
  };

  const responseTimeText = testResult?.responseTime ? `${testResult.responseTime}ms` : '';

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
      {/* 面板标题 */}
      <Group
        px="sm"
        py="xs"
        justify="space-between"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        })}
      >
        <Text size="sm" fw={600}>规则测试器</Text>
        <Group gap="xs">
          {/* 登录按钮 - 仅当书源配置了 loginUrl 时显示 */}
          {loginStatus.hasLoginUrl && (
            <Tooltip label={loginStatus.isLoggedIn ? '已登录，点击管理' : '点击登录'}>
              <ActionIcon
                variant={loginStatus.isLoggedIn ? 'filled' : 'light'}
                color={loginStatus.isLoggedIn ? 'green' : 'blue'}
                size="sm"
                onClick={() => setLoginDialogOpen(true)}
              >
                {loginStatus.isLoggedIn ? <IconUser size={14} /> : <IconLogin size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={aiAnalysisEnabled ? "开启后，AI对话将附加测试结果数据" : "关闭状态"}>
            <Group gap={4}>
              <IconSparkles size={14} color={aiAnalysisEnabled ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-dimmed)'} />
              <Text size="xs" c="dimmed">AI</Text>
              <Switch
                size="xs"
                checked={aiAnalysisEnabled}
                onChange={(e) => setAiAnalysisEnabled(e.currentTarget.checked)}
              />
            </Group>
          </Tooltip>
        </Group>
      </Group>

      {/* AI 分析状态提示 */}
      {aiAnalysisEnabled && testResult?.rawResponse && (
        <Group
          gap="xs"
          px="sm"
          py={6}
          style={(theme) => ({
            borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
            backgroundColor: 'var(--mantine-color-teal-light)',
          })}
        >
          <IconSparkles size={14} color="var(--mantine-color-teal-6)" />
          <Text size="xs" c="dimmed">
            已缓存 {(testResult.rawResponse.length / 1024).toFixed(1)}KB 响应数据
          </Text>
        </Group>
      )}

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="md" p="sm">
          {/* 测试模式选择 */}
          <SegmentedControl
            value={testMode}
            onChange={(value) => setTestMode(value as TestMode)}
            data={testModeOptions}
            size="xs"
            fullWidth
          />

          {/* URL/关键词输入 */}
          <Stack gap="xs">
            <Group gap="xs">
              {testMode === 'explore' && (exploreCategoryCount > 0 || isLoadingCategories) ? (
                // 发现模式：显示下拉框选择分类（支持分组）
                <Select
                  placeholder={isLoadingCategories ? "正在加载分类..." : "选择发现分类..."}
                  data={exploreCategories}
                  value={testInput || null}
                  onChange={(value) => setTestInput(value || '')}
                  searchable
                  clearable
                  disabled={isLoadingCategories}
                  style={{ flex: 1 }}
                  nothingFoundMessage="无匹配分类"
                  leftSection={isLoadingCategories ? <Loader size={14} /> : <IconCompass size={16} />}
                  maxDropdownHeight={300}
                />
              ) : (
                // 其他模式：显示文本输入框
                <TextInput
                  placeholder={testMode === 'search' ? '输入搜索关键词...' : testMode === 'explore' ? '输入发现URL（未配置分类或JS动态规则）...' : '输入URL...'}
                  value={testInput}
                  onChange={(e) => setTestInput(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                  style={{ flex: 1 }}
                  rightSection={
                    testHistory.length > 0 && (
                      <ActionIcon variant="subtle" size="sm" onClick={() => setShowHistory(!showHistory)}>
                        <IconHistory size={16} />
                      </ActionIcon>
                    )
                  }
                />
              )}
              <Button
                onClick={handleTest}
                loading={isLoading}
                leftSection={isLoading ? <IconPlayerStop size={16} /> : <IconPlayerPlay size={16} />}
              >
                {isLoading ? '停止' : '测试'}
              </Button>
            </Group>

            {/* 发现模式下显示分类数量提示 */}
            {testMode === 'explore' && (isLoadingCategories || exploreCategoryCount > 0) && (
              <Text size="xs" c="dimmed">
                {isLoadingCategories 
                  ? '正在解析 JS 动态发现规则...' 
                  : `已配置 ${exploreCategoryCount} 个发现分类${
                      exploreCategories.length > 0 && 'group' in exploreCategories[0] 
                        ? `（${exploreCategories.length} 个分组）` 
                        : ''
                    }`
                }
              </Text>
            )}

            {/* 历史记录下拉 */}
            <Collapse in={showHistory && testHistory.length > 0}>
              <Paper withBorder p="xs">
                <Text size="xs" c="dimmed" mb="xs">历史记录</Text>
                <ScrollArea.Autosize mah={120}>
                  <Stack gap={4}>
                    {testHistory.slice(0, 10).map((item, index) => (
                      <Button
                        key={index}
                        variant="subtle"
                        size="xs"
                        justify="flex-start"
                        leftSection={<IconHistory size={14} />}
                        onClick={() => {
                          setTestInput(item);
                          setShowHistory(false);
                        }}
                        styles={{ label: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                      >
                        {item}
                      </Button>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </Paper>
            </Collapse>
          </Stack>

          {/* 高级配置 */}
          <Box>
            <Button
              variant="subtle"
              size="xs"
              fullWidth
              justify="space-between"
              rightSection={showConfig ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              leftSection={<IconBolt size={16} />}
              onClick={() => setShowConfig(!showConfig)}
            >
              请求配置
            </Button>

            <Collapse in={showConfig}>
              <Paper withBorder p="sm" mt="xs">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" fw={500}>自定义 Headers</Text>
                  <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addRequestHeader}>
                    添加
                  </Button>
                </Group>
                {requestHeaders.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">暂无自定义请求头</Text>
                ) : (
                  <Stack gap="xs">
                    {requestHeaders.map((header, index) => (
                      <Group key={index} gap="xs">
                        <TextInput
                          placeholder="Header 名称"
                          value={header.key}
                          onChange={(e) => updateRequestHeader(index, 'key', e.currentTarget.value)}
                          size="xs"
                          style={{ flex: 1 }}
                        />
                        <TextInput
                          placeholder="Header 值"
                          value={header.value}
                          onChange={(e) => updateRequestHeader(index, 'value', e.currentTarget.value)}
                          size="xs"
                          style={{ flex: 1 }}
                        />
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeRequestHeader(index)}>
                          <IconMinus size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Collapse>
          </Box>

          <Divider />

          {/* 响应结果 */}
          <Box>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>响应结果</Text>
              {testResult && (
                <Group gap="xs">
                  <Badge
                    color={testResult.success ? 'teal' : 'red'}
                    variant="light"
                    leftSection={testResult.success ? <IconCircleCheck size={12} /> : <IconCircleX size={12} />}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowRequestInfo(!showRequestInfo)}
                  >
                    {testResult.statusCode || (testResult.success ? '成功' : '失败')}
                  </Badge>
                  {responseTimeText && (
                    <Badge variant="outline" leftSection={<IconClock size={12} />}>
                      {responseTimeText}
                    </Badge>
                  )}
                  {testResult.rawResponse && (
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(testResult.rawResponse || '')}
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                  )}
                </Group>
              )}
            </Group>

            {/* 请求详情展开 */}
            <Collapse in={showRequestInfo && !!testResult}>
              <Paper withBorder p="sm" mb="sm" bg={colorScheme === 'dark' ? 'dark.6' : 'gray.0'}>
                <Group gap="xs" mb="xs">
                  <IconInfoCircle size={14} />
                  <Text size="xs" fw={500}>请求信息</Text>
                </Group>
                <Stack gap={4} style={{ fontFamily: 'monospace' }}>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={60}>状态码:</Text>
                    <Text size="xs" c={testResult?.success ? 'teal' : 'red'}>
                      {testResult?.statusCode || 'N/A'}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={60}>耗时:</Text>
                    <Text size="xs">{testResult?.responseTime || 0}ms</Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={60}>大小:</Text>
                    <Text size="xs">{((testResult?.rawResponse?.length || 0) / 1024).toFixed(1)}KB</Text>
                  </Group>
                </Stack>
                {testResult?.error && (
                  <Paper withBorder p="xs" mt="xs" bg="red.0">
                    <Group gap="xs">
                      <IconAlertCircle size={14} color="var(--mantine-color-red-6)" />
                      <Text size="xs" c="red" style={{ wordBreak: 'break-all' }}>{testResult.error}</Text>
                    </Group>
                  </Paper>
                )}
              </Paper>
            </Collapse>

            {isLoading ? (
              <Box py="xl" ta="center">
                <Loader size="md" />
              </Box>
            ) : testResult ? (
              <Tabs value={activeResultTab} onChange={setActiveResultTab}>
                <Group justify="space-between" align="center">
                  <Tabs.List>
                    <Tabs.Tab value="visual">可视化</Tabs.Tab>
                    <Tabs.Tab value="parsed">解析结果</Tabs.Tab>
                    <Tabs.Tab value="raw">原始响应</Tabs.Tab>
                  </Tabs.List>
                  {/* 原始响应搜索和格式化按钮 - 只在选中原始响应 Tab 时显示 */}
                  {activeResultTab === 'raw' && (
                    <Group gap="xs">
                      <TextInput
                        placeholder="搜索..."
                        size="xs"
                        value={rawSearchKeyword}
                        onChange={(e) => setRawSearchKeyword(e.currentTarget.value)}
                        leftSection={<IconSearch size={14} />}
                        style={{ flex: 1, minWidth: 300, maxWidth: 500 }}
                        rightSection={
                          rawSearchKeyword && (
                            <ActionIcon variant="subtle" size="xs" onClick={() => setRawSearchKeyword('')}>
                              <IconX size={12} />
                            </ActionIcon>
                          )
                        }
                      />
                      <Tooltip label={isRawFormatted ? '显示原始' : '格式化'}>
                        <ActionIcon 
                          variant={isRawFormatted ? 'filled' : 'light'} 
                          size="sm"
                          onClick={() => setIsRawFormatted(!isRawFormatted)}
                        >
                          <IconCode size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                </Group>

                <Tabs.Panel value="visual" pt="sm" style={{ height: 'calc(100vh - 400px)', minHeight: 300 }}>
                  {/* 书籍列表 */}
                  {visualData.books.length > 0 && (
                    <Paper withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Group px="sm" py="xs" style={(theme) => ({ borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`, flexShrink: 0 })}>
                        {testMode === 'explore' ? <IconCompass size={16} /> : <IconWorld size={16} />}
                        <Text size="sm" fw={500}>
                          {testMode === 'explore' ? '发现结果' : '搜索结果'} ({visualData.books.length}本)
                        </Text>
                        <Text size="xs" c="dimmed" ml="auto">点击查看详情</Text>
                      </Group>
                      <ScrollArea style={{ flex: 1 }}>
                        <Stack gap={0}>
                          {visualData.books.map((book, index) => (
                            <Box
                              key={index}
                              p="sm"
                              style={(theme) => ({
                                cursor: 'pointer',
                                borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                                '&:hover': { backgroundColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0] },
                              })}
                              onClick={() => book.bookUrl && runTestWithParams('detail', book.bookUrl)}
                            >
                              <Group gap="sm" wrap="nowrap">
                                <Box w={48} h={64} style={{ flexShrink: 0, borderRadius: 4, overflow: 'hidden', backgroundColor: 'var(--mantine-color-gray-2)' }}>
                                  {book.coverUrl ? (
                                    <Image src={book.coverUrl} alt={book.name} w={48} h={64} fit="cover" />
                                  ) : (
                                    <Box h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <IconBook size={24} color="var(--mantine-color-dimmed)" />
                                    </Box>
                                  )}
                                </Box>
                                <Box style={{ flex: 1, overflow: 'hidden' }}>
                                  <Text size="sm" fw={500} lineClamp={1}>{book.name}</Text>
                                  {book.author && <Text size="xs" c="dimmed" lineClamp={1}>{book.author}</Text>}
                                  {book.intro && <Text size="xs" c="dimmed" lineClamp={2} mt={4}>{book.intro}</Text>}
                                </Box>
                                <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                              </Group>
                            </Box>
                          ))}
                        </Stack>
                      </ScrollArea>
                    </Paper>
                  )}

                  {/* 书籍详情 */}
                  {visualData.bookDetail && (
                    <Paper withBorder>
                      <Group px="sm" py="xs" style={(theme) => ({ borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}` })}>
                        <IconBook size={16} />
                        <Text size="sm" fw={500}>书籍详情</Text>
                      </Group>
                      <Box p="sm">
                        <Group gap="md" align="flex-start">
                          <Box w={96} h={128} style={{ flexShrink: 0, borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--mantine-color-gray-2)' }}>
                            {visualData.bookDetail.coverUrl ? (
                              <Image src={visualData.bookDetail.coverUrl} alt={visualData.bookDetail.name} w={96} h={128} fit="cover" />
                            ) : (
                              <Box h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconBook size={32} color="var(--mantine-color-dimmed)" />
                              </Box>
                            )}
                          </Box>
                          <Stack gap="xs" style={{ flex: 1 }}>
                            <Text size="lg" fw={600}>{visualData.bookDetail.name}</Text>
                            {visualData.bookDetail.author && (
                              <Text size="sm" c="dimmed">作者：{visualData.bookDetail.author}</Text>
                            )}
                            {visualData.bookDetail.kind && (
                              <Group gap={4}>
                                {visualData.bookDetail.kind.split(/[,，]/).map((tag: string, i: number) => (
                                  <Badge key={i} size="xs" variant="light">{tag.trim()}</Badge>
                                ))}
                              </Group>
                            )}
                            {visualData.bookDetail.lastChapter && (
                              <Text size="xs" c="dimmed">最新：{visualData.bookDetail.lastChapter}</Text>
                            )}
                          </Stack>
                        </Group>
                        {visualData.bookDetail.intro && (
                          <Box mt="sm">
                            <Text size="sm" fw={500} mb={4}>简介</Text>
                            <ScrollArea.Autosize mah={96}>
                              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>{visualData.bookDetail.intro}</Text>
                            </ScrollArea.Autosize>
                          </Box>
                        )}
                        {visualData.bookDetail.tocUrl && (
                          <Button
                            fullWidth
                            mt="sm"
                            leftSection={<IconList size={16} />}
                            onClick={() => runTestWithParams('toc', visualData.bookDetail!.tocUrl)}
                          >
                            查看目录
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  )}

                  {/* 章节列表 */}
                  {visualData.chapters.length > 0 && (
                    <Paper withBorder>
                      <Group px="sm" py="xs" style={(theme) => ({ borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}` })}>
                        <IconList size={16} />
                        <Text size="sm" fw={500}>目录 ({visualData.chapters.length}章)</Text>
                        {visualData.chapters.some(ch => ch.url) && (
                          <Text size="xs" c="dimmed" ml="auto">点击查看正文</Text>
                        )}
                      </Group>
                      <ScrollArea.Autosize mah={240}>
                        <Stack gap={0}>
                          {visualData.chapters.map((chapter, index) => (
                            <Group
                              key={index}
                              px="sm"
                              py="xs"
                              gap="sm"
                              style={(theme) => ({
                                cursor: chapter.url ? 'pointer' : 'default',
                                borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                                '&:hover': chapter.url ? { backgroundColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1] } : {},
                              })}
                              onClick={() => chapter.url && runTestWithParams('content', chapter.url)}
                            >
                              <Badge size="sm" variant="light" color="gray">{index + 1}</Badge>
                              <Text size="sm" style={{ flex: 1 }} lineClamp={1}>{chapter.name}</Text>
                              {chapter.url ? (
                                <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                              ) : (
                                <Badge size="xs" variant="light" color="yellow">无链接</Badge>
                              )}
                            </Group>
                          ))}
                        </Stack>
                      </ScrollArea.Autosize>
                    </Paper>
                  )}

                  {/* 正文内容 */}
                  {visualData.content && (
                    <Paper withBorder>
                      <Group px="sm" py="xs" style={(theme) => ({ borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}` })}>
                        <IconFileText size={16} />
                        <Text size="sm" fw={500}>正文内容</Text>
                      </Group>
                      <ScrollArea.Autosize mah={240}>
                        <Box p="sm">
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{visualData.content}</Text>
                        </Box>
                      </ScrollArea.Autosize>
                    </Paper>
                  )}

                  {/* 图片内容 */}
                  {visualData.imageUrls && visualData.imageUrls.length > 0 && (
                    <Paper withBorder>
                      <Group px="sm" py="xs" style={(theme) => ({ borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}` })}>
                        <IconPhoto size={16} />
                        <Text size="sm" fw={500}>图片内容 ({visualData.imageUrls.length}张)</Text>
                        <Text size="xs" c="dimmed">点击图片放大查看</Text>
                      </Group>
                      <ScrollArea.Autosize mah={320}>
                        <Box p="sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {visualData.imageUrls.map((url, index) => (
                            <Box 
                              key={index} 
                              style={{ 
                                aspectRatio: '3/4', 
                                borderRadius: 8, 
                                overflow: 'hidden', 
                                backgroundColor: 'var(--mantine-color-gray-2)',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                position: 'relative',
                              }}
                              onClick={() => {
                                setCurrentImageIndex(index);
                                setImageViewerOpen(true);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <Image src={url} alt={`第${index + 1}页`} fit="contain" h="100%" />
                              <Box 
                                style={{ 
                                  position: 'absolute', 
                                  bottom: 4, 
                                  right: 4, 
                                  background: 'rgba(0,0,0,0.6)', 
                                  borderRadius: 4, 
                                  padding: '2px 6px' 
                                }}
                              >
                                <Text size="xs" c="white">{index + 1}</Text>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </ScrollArea.Autosize>
                    </Paper>
                  )}

                  {/* 无数据 */}
                  {!visualData.books.length && !visualData.chapters.length && !visualData.content && !visualData.bookDetail && (!visualData.imageUrls || visualData.imageUrls.length === 0) && (
                    <Box py="xl" ta="center">
                      <Text c="dimmed">暂无可视化数据</Text>
                    </Box>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="parsed" pt="sm">
                  {testResult.parsedData && testResult.parsedData.length > 0 ? (
                    <Stack gap={4}>
                      {testResult.parsedData.map((item, index) => (
                        <Paper
                          key={index}
                          p="xs"
                          withBorder
                          style={{ borderLeftWidth: 3, borderLeftColor: item.matched ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-gray-4)' }}
                        >
                          <Group gap="xs" wrap="nowrap">
                            <Text size="xs" fw={500} c="teal" style={{ flexShrink: 0 }}>{item.key}</Text>
                            <Text size="xs" style={{ wordBreak: 'break-all' }}>{item.value}</Text>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Box py="xl" ta="center">
                      <Text c="dimmed">暂无解析结果</Text>
                    </Box>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="raw" pt="sm" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <ScrollArea style={{ flex: 1 }}>
                    <Paper p="sm" bg={colorScheme === 'dark' ? 'dark.6' : 'gray.0'} style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {(() => {
                        const rawContent = testResult.rawResponse || '无响应内容';
                        
                        // 格式化处理
                        let displayContent = rawContent;
                        if (isRawFormatted && rawContent !== '无响应内容') {
                          try {
                            // 尝试 JSON 格式化
                            const parsed = JSON.parse(rawContent);
                            displayContent = JSON.stringify(parsed, null, 2);
                          } catch {
                            // 尝试 XML/HTML 格式化
                            if (rawContent.trim().startsWith('<')) {
                              displayContent = rawContent
                                .replace(/></g, '>\n<')
                                .replace(/>\s+</g, '>\n<');
                            }
                          }
                        }
                        
                        // 搜索高亮处理
                        if (rawSearchKeyword.trim()) {
                          const keyword = rawSearchKeyword.trim();
                          const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                          const parts = displayContent.split(regex);
                          return parts.map((part, index) => 
                            regex.test(part) ? (
                              <span key={index} style={{ backgroundColor: 'var(--mantine-color-yellow-4)', color: 'black', padding: '0 2px', borderRadius: 2 }}>
                                {part}
                              </span>
                            ) : part
                          );
                        }
                        
                        return displayContent;
                      })()}
                    </Paper>
                  </ScrollArea>
                </Tabs.Panel>
              </Tabs>
            ) : (
              <Box py="xl" ta="center">
                <Text c="dimmed">点击测试按钮开始测试</Text>
              </Box>
            )}
          </Box>
        </Stack>
      </ScrollArea>

      {/* 图片查看器 Modal */}
      <Modal
        opened={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        size="xl"
        fullScreen
        padding={0}
        withCloseButton={false}
        styles={{
          body: { 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
          },
          content: {
            backgroundColor: 'transparent',
          },
        }}
      >
        {visualData.imageUrls && visualData.imageUrls.length > 0 && (
          <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 顶部工具栏 */}
            <Group 
              justify="space-between" 
              px="md" 
              py="sm" 
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Group gap="md">
                {/* 章节名称 */}
                {currentChapterName && (
                  <Text c="white" fw={500} size="sm" style={{ maxWidth: 300 }} lineClamp={1}>
                    📖 {currentChapterName}
                  </Text>
                )}
                
                {currentChapterName && <Divider orientation="vertical" color="gray" />}
                
                <Text c="white" fw={500}>
                  {viewMode === 'horizontal' ? `${currentImageIndex + 1} / ${visualData.imageUrls.length}` : `共 ${visualData.imageUrls.length} 页`}
                </Text>
                {/* 模式切换 */}
                <Group gap={4}>
                  <Tooltip label="翻页模式">
                    <ActionIcon 
                      variant={viewMode === 'horizontal' ? 'filled' : 'subtle'}
                      color={viewMode === 'horizontal' ? 'teal' : 'gray'}
                      size="md"
                      onClick={() => setViewMode('horizontal')}
                    >
                      <IconLayoutColumns size={16} color="white" />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="条漫模式">
                    <ActionIcon 
                      variant={viewMode === 'vertical' ? 'filled' : 'subtle'}
                      color={viewMode === 'vertical' ? 'teal' : 'gray'}
                      size="md"
                      onClick={() => setViewMode('vertical')}
                    >
                      <IconLayoutRows size={16} color="white" />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {viewMode === 'horizontal' ? '滚轮/方向键翻页' : '滚动浏览'}
                </Text>
                <ActionIcon 
                  variant="subtle" 
                  color="gray" 
                  size="lg"
                  onClick={() => setImageViewerOpen(false)}
                >
                  <IconX size={20} color="white" />
                </ActionIcon>
              </Group>
            </Group>

            {/* 横向翻页模式 */}
            {viewMode === 'horizontal' && (
              <Box 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 左侧控制区：上一章 + 上一页 */}
                <Group 
                  gap={8} 
                  style={{ 
                    position: 'absolute', 
                    left: 16, 
                    zIndex: 10,
                  }}
                >
                  {/* 上一章 */}
                  {hasPrevChapter && (
                    <Tooltip label={`上一章: ${chapterList[currentChapterIndex - 1]?.name}`}>
                      <ActionIcon
                        variant="filled"
                        size="xl"
                        radius="xl"
                        color="teal"
                        onClick={handlePrevChapter}
                        loading={isLoading}
                      >
                        <IconPlayerSkipBack size={22} color="white" />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {/* 上一页 */}
                  <ActionIcon
                    variant="subtle"
                    size="xl"
                    radius="xl"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentImageIndex === 0}
                  >
                    <IconChevronLeft size={28} color="white" />
                  </ActionIcon>
                </Group>

                {/* 图片 */}
                <Image
                  src={visualData.imageUrls[currentImageIndex]}
                  alt={`第${currentImageIndex + 1}页`}
                  fit="contain"
                  style={{ maxHeight: 'calc(100vh - 120px)', maxWidth: '100%' }}
                />

                {/* 右侧控制区：下一页 + 下一章 */}
                <Group 
                  gap={8} 
                  style={{ 
                    position: 'absolute', 
                    right: 16, 
                    zIndex: 10,
                  }}
                >
                  {/* 下一页 */}
                  <ActionIcon
                    variant="subtle"
                    size="xl"
                    radius="xl"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={() => setCurrentImageIndex(prev => Math.min(visualData.imageUrls.length - 1, prev + 1))}
                    disabled={currentImageIndex === visualData.imageUrls.length - 1}
                  >
                    <IconChevronRight size={28} color="white" />
                  </ActionIcon>
                  {/* 下一章 */}
                  {hasNextChapter && (
                    <Tooltip label={`下一章: ${chapterList[currentChapterIndex + 1]?.name}`}>
                      <ActionIcon
                        variant="filled"
                        size="xl"
                        radius="xl"
                        color="teal"
                        onClick={handleNextChapter}
                        loading={isLoading}
                      >
                        <IconPlayerSkipForward size={22} color="white" />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Box>
            )}

            {/* 纵向条漫模式 */}
            {viewMode === 'vertical' && (
              <Box style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* 左侧上一章按钮 - 固定位置 */}
                {hasPrevChapter && (
                  <Tooltip label={`上一章: ${chapterList[currentChapterIndex - 1]?.name}`}>
                    <ActionIcon
                      variant="filled"
                      size="xl"
                      radius="xl"
                      color="teal"
                      onClick={handlePrevChapter}
                      loading={isLoading}
                      style={{
                        position: 'absolute',
                        left: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                      }}
                    >
                      <IconPlayerSkipBack size={22} color="white" />
                    </ActionIcon>
                  </Tooltip>
                )}
                
                {/* 右侧下一章按钮 - 固定位置 */}
                {hasNextChapter && (
                  <Tooltip label={`下一章: ${chapterList[currentChapterIndex + 1]?.name}`}>
                    <ActionIcon
                      variant="filled"
                      size="xl"
                      radius="xl"
                      color="teal"
                      onClick={handleNextChapter}
                      loading={isLoading}
                      style={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                      }}
                    >
                      <IconPlayerSkipForward size={22} color="white" />
                    </ActionIcon>
                  </Tooltip>
                )}
                
                {/* 滚动区域 */}
                <ScrollArea style={{ height: '100%' }} type="scroll">
                  <Stack gap={0} align="center" py="md" px={60}>
                    {visualData.imageUrls.map((url, index) => (
                      <Box key={index} style={{ width: '100%', maxWidth: 800 }}>
                        <Image
                          src={url}
                          alt={`第${index + 1}页`}
                          fit="contain"
                          w="100%"
                        />
                      </Box>
                    ))}
                  </Stack>
                </ScrollArea>
              </Box>
            )}

            {/* 底部缩略图导航（仅横向模式显示） */}
            {viewMode === 'horizontal' && (
            <Box 
              py="sm" 
              px="md"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <ScrollArea>
                <Group gap={8} wrap="nowrap">
                  {visualData.imageUrls.map((url, index) => (
                    <Box
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      style={{
                        width: 60,
                        height: 80,
                        borderRadius: 4,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: index === currentImageIndex ? '2px solid var(--mantine-color-teal-5)' : '2px solid transparent',
                        opacity: index === currentImageIndex ? 1 : 0.6,
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <Image src={url} alt={`缩略图${index + 1}`} fit="cover" h="100%" w="100%" />
                    </Box>
                  ))}
                </Group>
              </ScrollArea>
            </Box>
            )}
          </Box>
        )}
      </Modal>

      {/* 登录对话框 */}
      <SourceLoginDialog
        opened={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        source={currentSource}
        onLoginSuccess={() => {
          // 刷新登录状态
          setLoginStatus(prev => ({ ...prev, isLoggedIn: true }));
        }}
      />
    </Box>
  );
}

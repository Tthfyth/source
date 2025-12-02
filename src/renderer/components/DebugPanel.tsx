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
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import type { BookItem, ChapterItem, TestMode } from '../types';

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
  } = useBookSourceStore();

  const { colorScheme } = useMantineColorScheme();
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<string | null>('visual');

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

  const handleTest = async () => {
    if (!testInput.trim()) {
      return;
    }
    await runTest();
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
              <TextInput
                placeholder={testMode === 'search' ? '输入搜索关键词...' : testMode === 'explore' ? '选择发现分类...' : '输入URL...'}
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
              <Button
                onClick={handleTest}
                loading={isLoading}
                leftSection={isLoading ? <IconPlayerStop size={16} /> : <IconPlayerPlay size={16} />}
              >
                {isLoading ? '停止' : '测试'}
              </Button>
            </Group>

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
                <Tabs.List>
                  <Tabs.Tab value="visual">可视化</Tabs.Tab>
                  <Tabs.Tab value="parsed">解析结果</Tabs.Tab>
                  <Tabs.Tab value="raw">原始响应</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="visual" pt="sm">
                  {/* 书籍列表 */}
                  {visualData.books.length > 0 && (
                    <Paper withBorder>
                      <Group px="sm" py="xs" style={(theme) => ({ borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}` })}>
                        {testMode === 'explore' ? <IconCompass size={16} /> : <IconWorld size={16} />}
                        <Text size="sm" fw={500}>
                          {testMode === 'explore' ? '发现结果' : '搜索结果'} ({visualData.books.length}本)
                        </Text>
                        <Text size="xs" c="dimmed" ml="auto">点击查看详情</Text>
                      </Group>
                      <ScrollArea.Autosize mah={240}>
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
                      </ScrollArea.Autosize>
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
                      </Group>
                      <ScrollArea.Autosize mah={320}>
                        <Box p="sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                          {visualData.imageUrls.map((url, index) => (
                            <Box key={index} style={{ aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--mantine-color-gray-2)' }}>
                              <Image src={url} alt={`第${index + 1}页`} fit="contain" h="100%" />
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

                <Tabs.Panel value="raw" pt="sm">
                  <ScrollArea.Autosize mah={240}>
                    <Paper p="sm" bg={colorScheme === 'dark' ? 'dark.6' : 'gray.0'} style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {testResult.rawResponse || '无响应内容'}
                    </Paper>
                  </ScrollArea.Autosize>
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
    </Box>
  );
}

import React, { useState, useMemo } from 'react';
import {
  Play,
  Square,
  Plus,
  Minus,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Book,
  List,
  FileText,
  Image,
  Sparkles,
  History,
  Globe,
  RefreshCw,
  Copy,
  ExternalLink,
  Compass,
  Zap,
  Info,
  AlertCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { cn } from '../lib/utils';
import type { BookItem, ChapterItem, TestMode } from '../types';

const testModeOptions: { label: string; value: TestMode; icon: React.ReactNode }[] = [
  { label: '搜索', value: 'search', icon: <Globe className="h-3.5 w-3.5" /> },
  { label: '发现', value: 'explore', icon: <Compass className="h-3.5 w-3.5" /> },
  { label: '详情', value: 'detail', icon: <Book className="h-3.5 w-3.5" /> },
  { label: '目录', value: 'toc', icon: <List className="h-3.5 w-3.5" /> },
  { label: '正文', value: 'content', icon: <FileText className="h-3.5 w-3.5" /> },
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

  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('visual');

  // 可视化数据
  const visualData = useMemo(() => {
    if (!testResult?.rawParsedItems) return { books: [], chapters: [], content: '', bookDetail: null };

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
      return { books, chapters: [], content: '', bookDetail: null };
    }

    if (testMode === 'detail') {
      // 详情模式：显示单本书的详细信息
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
        return { books: [], chapters: [], content: '', bookDetail };
      }
      return { books: [], chapters: [], content: '', bookDetail: null };
    }

    if (testMode === 'toc') {
      const chapters: ChapterItem[] = Array.isArray(items)
        ? items.map((item: any) => ({
            name: item.chapterName || item.name || item.title || '',
            url: item.chapterUrl || item.url || '',
          })).filter((ch: ChapterItem) => ch.name && ch.url)
        : [];
      return { books: [], chapters, content: '', bookDetail: null };
    }

    if (testMode === 'content') {
      let content = '';
      let imageUrls: string[] = [];
      
      // 检查是否有图片URL列表（图片书源）
      if (testResult.imageUrls && Array.isArray(testResult.imageUrls)) {
        imageUrls = testResult.imageUrls;
      } else if (Array.isArray(items)) {
        // 检查数组内容是否都是图片URL
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

  // 执行测试
  const handleTest = async () => {
    if (!testInput.trim()) {
      alert('请输入测试关键词或URL');
      return;
    }
    await runTest();
  };

  // 响应时间格式化
  const responseTimeText = testResult?.responseTime
    ? `${testResult.responseTime}ms`
    : '';

  return (
    <div className="flex h-full flex-col border-l bg-card">
      {/* 面板标题 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">规则测试器</span>
        <div className="flex items-center gap-2" title={aiAnalysisEnabled ? "开启后，AI对话将附加测试结果数据" : "关闭状态"}>
          <Sparkles className={cn("h-3.5 w-3.5", aiAnalysisEnabled ? "text-primary" : "text-muted-foreground")} />
          <span className="text-xs text-muted-foreground">AI</span>
          <Switch
            checked={aiAnalysisEnabled}
            onCheckedChange={setAiAnalysisEnabled}
          />
        </div>
      </div>

      {/* AI 分析状态提示 */}
      {aiAnalysisEnabled && testResult?.rawResponse && (
        <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">
            已缓存 {(testResult.rawResponse.length / 1024).toFixed(1)}KB 响应数据，将附加到下次 AI 对话
          </span>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* 测试模式选择 - 更紧凑的设计 */}
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
            {testModeOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
                  testMode === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
                onClick={() => setTestMode(option.value)}
                title={option.label}
              >
                {option.icon}
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>

          {/* URL/关键词输入 - 增强版 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder={testMode === 'search' ? '输入搜索关键词...' : testMode === 'explore' ? '选择发现分类...' : '输入URL...'}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                  className="pr-8"
                />
                {testHistory.length > 0 && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowHistory(!showHistory)}
                    title="历史记录"
                  >
                    <History className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button 
                onClick={handleTest} 
                disabled={isLoading}
                className="min-w-[80px]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                    停止
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-4 w-4" />
                    测试
                  </>
                )}
              </Button>
            </div>
            
            {/* 历史记录下拉 */}
            {showHistory && testHistory.length > 0 && (
              <div className="rounded-lg border bg-popover p-1 shadow-md">
                <div className="mb-1 px-2 py-1 text-xs font-medium text-muted-foreground">历史记录</div>
                <div className="max-h-32 overflow-y-auto">
                  {testHistory.slice(0, 10).map((item, index) => (
                    <button
                      key={index}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setTestInput(item);
                        setShowHistory(false);
                      }}
                    >
                      <History className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 truncate">{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 高级配置 - 折叠面板 */}
          <div className="space-y-2">
            <button
              className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => setShowConfig(!showConfig)}
            >
              <span className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" />
                请求配置
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  showConfig && 'rotate-180'
                )}
              />
            </button>

            {showConfig && (
              <div className="space-y-3 rounded-lg border bg-card p-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">自定义 Headers</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addRequestHeader}
                    className="h-7"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    添加
                  </Button>
                </div>
                {requestHeaders.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    暂无自定义请求头
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requestHeaders.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Header 名称"
                          value={header.key}
                          onChange={(e) =>
                            updateRequestHeader(index, 'key', e.target.value)
                          }
                          className="flex-1 h-8 text-xs"
                        />
                        <Input
                          placeholder="Header 值"
                          value={header.value}
                          onChange={(e) =>
                            updateRequestHeader(index, 'value', e.target.value)
                          }
                          className="flex-1 h-8 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeRequestHeader(index)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* 响应结果 - 增强版 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">响应结果</span>
              {testResult && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={testResult.success ? 'success' : 'destructive'}
                    className="cursor-pointer"
                    onClick={() => setShowRequestInfo(!showRequestInfo)}
                    title="点击查看请求详情"
                  >
                    {testResult.success ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {testResult.statusCode || (testResult.success ? '成功' : '失败')}
                  </Badge>
                  {responseTimeText && (
                    <Badge variant="outline" className="font-mono">
                      <Clock className="mr-1 h-3 w-3" />
                      {responseTimeText}
                    </Badge>
                  )}
                  {testResult.rawResponse && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => navigator.clipboard.writeText(testResult.rawResponse || '')}
                      title="复制响应内容"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* 请求详情展开 */}
            {showRequestInfo && testResult && (
              <div className="mb-3 rounded-lg border bg-muted/30 p-3 text-xs space-y-2 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span className="font-medium">请求信息</span>
                </div>
                <div className="space-y-1 font-mono">
                  <div className="flex">
                    <span className="w-16 shrink-0 text-muted-foreground">状态码:</span>
                    <span className={testResult.success ? 'text-green-600' : 'text-red-600'}>
                      {testResult.statusCode || 'N/A'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-16 shrink-0 text-muted-foreground">耗时:</span>
                    <span>{testResult.responseTime || 0}ms</span>
                  </div>
                  <div className="flex">
                    <span className="w-16 shrink-0 text-muted-foreground">大小:</span>
                    <span>{((testResult.rawResponse?.length || 0) / 1024).toFixed(1)}KB</span>
                  </div>
                </div>
                {testResult.error && (
                  <div className="mt-2 flex items-start gap-2 rounded bg-destructive/10 p-2 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="break-all">{testResult.error}</span>
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : testResult ? (
              <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="visual" className="flex-1">
                    可视化
                  </TabsTrigger>
                  <TabsTrigger value="parsed" className="flex-1">
                    解析结果
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="flex-1">
                    原始响应
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="mt-3">
                  {/* 书籍列表 */}
                  {visualData.books.length > 0 && (
                    <div className="rounded-lg border">
                      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                        {testMode === 'explore' ? <Compass className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        {testMode === 'explore' ? '发现结果' : '搜索结果'} ({visualData.books.length}本)
                        <span className="ml-auto text-xs text-muted-foreground">点击查看详情</span>
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="divide-y">
                          {visualData.books.map((book, index) => (
                            <div
                              key={index}
                              className="flex cursor-pointer gap-3 p-3 hover:bg-accent transition-colors"
                              onClick={() => {
                                if (book.bookUrl) {
                                  runTestWithParams('detail', book.bookUrl);
                                }
                              }}
                              title={book.bookUrl ? `点击查看详情: ${book.bookUrl}` : '无书籍链接'}
                            >
                              <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                                {book.coverUrl ? (
                                  <img
                                    src={book.coverUrl}
                                    alt={book.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Book className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="truncate font-medium">
                                  {book.name}
                                </div>
                                {book.author && (
                                  <div className="truncate text-xs text-muted-foreground">
                                    {book.author}
                                  </div>
                                )}
                                {book.intro && (
                                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {book.intro}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* 书籍详情 */}
                  {visualData.bookDetail && (
                    <div className="rounded-lg border">
                      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                        <Book className="h-4 w-4" />
                        书籍详情
                      </div>
                      <div className="p-4">
                        <div className="flex gap-4">
                          {/* 封面 */}
                          <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {visualData.bookDetail.coverUrl ? (
                              <img
                                src={visualData.bookDetail.coverUrl}
                                alt={visualData.bookDetail.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Book className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          {/* 信息 */}
                          <div className="flex-1 space-y-2">
                            <div className="text-lg font-semibold">{visualData.bookDetail.name}</div>
                            {visualData.bookDetail.author && (
                              <div className="text-sm text-muted-foreground">
                                作者：{visualData.bookDetail.author}
                              </div>
                            )}
                            {visualData.bookDetail.kind && (
                              <div className="flex flex-wrap gap-1">
                                {visualData.bookDetail.kind.split(/[,，]/).map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag.trim()}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {visualData.bookDetail.lastChapter && (
                              <div className="text-xs text-muted-foreground">
                                最新：{visualData.bookDetail.lastChapter}
                              </div>
                            )}
                            {visualData.bookDetail.updateTime && (
                              <div className="text-xs text-muted-foreground">
                                更新：{visualData.bookDetail.updateTime}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 简介 */}
                        {visualData.bookDetail.intro && (
                          <div className="mt-4">
                            <div className="mb-1 text-sm font-medium">简介</div>
                            <div className="max-h-24 overflow-y-auto text-sm text-muted-foreground leading-relaxed">
                              {visualData.bookDetail.intro}
                            </div>
                          </div>
                        )}
                        {/* 查看目录按钮 */}
                        {visualData.bookDetail.tocUrl && (
                          <Button
                            className="mt-4 w-full"
                            onClick={() => {
                              runTestWithParams('toc', visualData.bookDetail!.tocUrl);
                            }}
                          >
                            <List className="mr-2 h-4 w-4" />
                            查看目录
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 章节列表 */}
                  {visualData.chapters.length > 0 && (
                    <div className="rounded-lg border">
                      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                        <List className="h-4 w-4" />
                        目录 ({visualData.chapters.length}章)
                        <span className="ml-auto text-xs text-muted-foreground">点击查看正文</span>
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="divide-y">
                          {visualData.chapters.map((chapter, index) => (
                            <div
                              key={index}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent transition-colors"
                              onClick={() => {
                                if (chapter.url) {
                                  runTestWithParams('content', chapter.url);
                                }
                              }}
                              title={chapter.url ? `点击查看正文: ${chapter.url}` : '无章节链接'}
                            >
                              <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                                {index + 1}
                              </span>
                              <span className="flex-1 truncate text-sm">
                                {chapter.name}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* 正文内容 */}
                  {visualData.content && (
                    <div className="rounded-lg border">
                      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                        <FileText className="h-4 w-4" />
                        正文内容
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="whitespace-pre-wrap p-3 text-sm leading-relaxed">
                          {visualData.content}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* 图片内容（图片书源） */}
                  {visualData.imageUrls && visualData.imageUrls.length > 0 && (
                    <div className="rounded-lg border">
                      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                        <Image className="h-4 w-4" />
                        图片内容 ({visualData.imageUrls.length}张)
                      </div>
                      <ScrollArea className="max-h-80">
                        <div className="grid grid-cols-2 gap-2 p-3">
                          {visualData.imageUrls.map((url, index) => (
                            <div
                              key={index}
                              className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted"
                            >
                              <img
                                src={url}
                                alt={`第${index + 1}页`}
                                className="h-full w-full object-contain"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                  (e.target as HTMLImageElement).alt = '加载失败';
                                }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                第{index + 1}页
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* 无数据 */}
                  {!visualData.books.length &&
                    !visualData.chapters.length &&
                    !visualData.content &&
                    !visualData.bookDetail &&
                    (!visualData.imageUrls || visualData.imageUrls.length === 0) && (
                      <div className="flex h-40 items-center justify-center text-muted-foreground">
                        暂无可视化数据
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="parsed" className="mt-3">
                  {testResult.parsedData && testResult.parsedData.length > 0 ? (
                    <div className="space-y-1">
                      {testResult.parsedData.map((item, index) => (
                        <div
                          key={index}
                          className={cn(
                            'flex rounded border-l-2 bg-muted/50 px-3 py-2 text-sm',
                            item.matched
                              ? 'border-l-green-500'
                              : 'border-l-border'
                          )}
                        >
                          <span className="mr-2 shrink-0 font-medium text-primary">
                            {item.key}
                          </span>
                          <span className="break-all">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center text-muted-foreground">
                      暂无解析结果
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="raw" className="mt-3">
                  <ScrollArea className="h-60">
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
                      {testResult.rawResponse || '无响应内容'}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                点击发送按钮开始测试
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

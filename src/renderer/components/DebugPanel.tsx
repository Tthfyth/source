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
  Book,
  List,
  FileText,
  Image,
  Sparkles,
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

const testModeOptions: { label: string; value: TestMode }[] = [
  { label: '搜索', value: 'search' },
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
    requestHeaders,
    addRequestHeader,
    removeRequestHeader,
    updateRequestHeader,
    aiAnalysisEnabled,
    setAiAnalysisEnabled,
  } = useBookSourceStore();

  const [showConfig, setShowConfig] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('visual');

  // 可视化数据
  const visualData = useMemo(() => {
    if (!testResult?.rawParsedItems) return { books: [], chapters: [], content: '' };

    const items = testResult.rawParsedItems;

    if (testMode === 'search' || testMode === 'detail') {
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
      return { books, chapters: [], content: '' };
    }

    if (testMode === 'toc') {
      const chapters: ChapterItem[] = Array.isArray(items)
        ? items.map((item: any) => ({
            name: item.chapterName || item.name || item.title || '',
            url: item.chapterUrl || item.url || '',
          })).filter((ch: ChapterItem) => ch.name && ch.url)
        : [];
      return { books: [], chapters, content: '' };
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
      
      return { books: [], chapters: [], content, imageUrls };
    }

    return { books: [], chapters: [], content: '', imageUrls: [] };
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
          {/* 测试模式选择 */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {testModeOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  testMode === option.value
                    ? 'bg-background text-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setTestMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* URL/关键词输入 */}
          <div className="flex gap-2">
            <Input
              placeholder="输入测试关键词或URL..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={isLoading}>
              {isLoading ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 高级配置 */}
          <div>
            <button
              className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfig(!showConfig)}
            >
              <span>请求配置</span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  showConfig && 'rotate-90'
                )}
              />
            </button>

            {showConfig && (
              <div className="mt-3 space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Headers</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addRequestHeader}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    添加
                  </Button>
                </div>
                {requestHeaders.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Key"
                      value={header.key}
                      onChange={(e) =>
                        updateRequestHeader(index, 'key', e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={header.value}
                      onChange={(e) =>
                        updateRequestHeader(index, 'value', e.target.value)
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequestHeader(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* 响应结果 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">响应结果</span>
              {testResult && (
                <div className="flex gap-2">
                  <Badge variant={testResult.success ? 'success' : 'destructive'}>
                    {testResult.success ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {testResult.statusCode || (testResult.success ? '成功' : '失败')}
                  </Badge>
                  {responseTimeText && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      {responseTimeText}
                    </Badge>
                  )}
                </div>
              )}
            </div>

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
                        <Book className="h-4 w-4" />
                        搜索结果 ({visualData.books.length}本)
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="divide-y">
                          {visualData.books.map((book, index) => (
                            <div
                              key={index}
                              className="flex cursor-pointer gap-3 p-3 hover:bg-accent"
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

                  {/* 章节列表 */}
                  {visualData.chapters.length > 0 && (
                    <div className="rounded-lg border">
                      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                        <List className="h-4 w-4" />
                        目录 ({visualData.chapters.length}章)
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="divide-y">
                          {visualData.chapters.map((chapter, index) => (
                            <div
                              key={index}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent"
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

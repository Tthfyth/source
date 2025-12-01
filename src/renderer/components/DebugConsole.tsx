import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Trash2, Download, Copy, Search, X, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { cn } from '../lib/utils';
import type { LogCategory, DebugLog } from '../types';

const categoryLabels: Record<LogCategory, string> = {
  request: '请求',
  parse: '解析',
  field: '字段',
  error: '错误',
};

const categoryColors: Record<LogCategory, string> = {
  request: 'bg-blue-500',
  parse: 'bg-green-500',
  field: 'bg-purple-500',
  error: 'bg-red-500',
};

export function DebugConsole() {
  const { debugLogs, logFilters, setLogFilters, clearLogs } =
    useBookSourceStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // 过滤后的日志
  const filteredLogs = useMemo(() => {
    let logs = debugLogs.filter((log) => logFilters.includes(log.category));
    
    // 搜索过滤
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
      .map(
        (log) =>
          `[${formatTime(log.timestamp)}] [${log.category}] ${log.message}`
      )
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
  const getLogLevelClass = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10';
      case 'warning':
        return 'bg-yellow-500/10';
      case 'success':
        return 'bg-green-500/5';
      default:
        return '';
    }
  };

  return (
    <div className="flex h-full flex-col border-t bg-card">
      {/* 控制台头部 */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">调试日志</span>
          <Badge variant="outline" className="text-xs font-mono">
            {filteredLogs.length}/{debugLogs.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          {showSearch ? (
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索日志..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-40 pl-7 pr-7 text-xs"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSearch(true)}
              title="搜索日志"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}

          <div className="h-4 w-px bg-border" />

          {/* 过滤器 */}
          <div className="flex gap-0.5">
            {(Object.keys(categoryLabels) as LogCategory[]).map((category) => (
              <button
                key={category}
                className={cn(
                  'rounded px-1.5 py-0.5 text-xs transition-colors',
                  logFilters.includes(category)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                onClick={() => toggleFilter(category)}
                title={categoryLabels[category]}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* 操作按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={copyLogs}
            disabled={!filteredLogs.length}
            title="复制日志"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={exportLogs}
            disabled={!filteredLogs.length}
            title="导出日志"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearLogs}
            disabled={!debugLogs.length}
            title="清空日志"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 日志内容 */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-2 font-mono text-xs">
          {filteredLogs.length > 0 ? (
            <div className="space-y-0.5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'flex flex-wrap items-start gap-2 rounded px-2 py-1 hover:bg-muted/50',
                    getLogLevelClass(log.level),
                    log.details && 'cursor-pointer'
                  )}
                  onClick={() =>
                    log.details &&
                    setExpandedLogId(
                      expandedLogId === log.id ? null : log.id
                    )
                  }
                >
                  <span className="shrink-0 text-muted-foreground">
                    {formatTime(log.timestamp)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-white',
                      categoryColors[log.category]
                    )}
                  >
                    {categoryLabels[log.category]}
                  </span>
                  <span className="flex-1 break-all">{log.message}</span>
                  {log.details && (
                    <span className="shrink-0 text-muted-foreground">
                      {expandedLogId === log.id ? '▼' : '▶'}
                    </span>
                  )}

                  {/* 详情展开 */}
                  {expandedLogId === log.id && log.details && (
                    <div className="mt-1 w-full rounded bg-muted p-2">
                      <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                        {log.details}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center text-muted-foreground">
              <p>执行测试后将在此显示调试信息</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

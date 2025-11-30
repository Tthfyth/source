import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FolderOpen,
  Save,
  MoreVertical,
  Trash2,
  Copy,
  Download,
  CheckCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { cn } from '../lib/utils';

export function SourceSidebar() {
  const {
    sources,
    activeSourceId,
    selectSource,
    createSource,
    importSources,
    deleteSource,
  } = useBookSourceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuSource, setContextMenuSource] = useState<string | null>(
    null
  );

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
          alert(`成功导入 ${count} 个书源`);
        } else {
          alert('导入失败，请检查文件格式');
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
      alert('已复制到剪贴板');
    }
    setContextMenuSource(null);
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
    setContextMenuSource(null);
  };

  // 删除书源
  const handleDelete = (url: string) => {
    if (confirm('确定要删除这个书源吗？此操作不可恢复。')) {
      deleteSource(url);
    }
    setContextMenuSource(null);
  };

  return (
    <div className="flex h-full flex-col border-r bg-card">
      {/* 标题 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">书源管理</span>
        <Badge variant="secondary">{sources.length}</Badge>
      </div>

      {/* 搜索框 */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="过滤书源名称或URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* 书源列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredSources.length > 0 ? (
            <div className="space-y-1">
              {filteredSources.map((source) => (
                <div
                  key={source.bookSourceUrl}
                  className={cn(
                    'group relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                    activeSourceId === source.bookSourceUrl &&
                      'bg-primary/10 text-primary'
                  )}
                  onClick={() => selectSource(source.bookSourceUrl)}
                >
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      source.enabled ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <span className="flex-1 truncate">
                    {source.bookSourceName || '未命名书源'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuSource(
                        contextMenuSource === source.bookSourceUrl
                          ? null
                          : source.bookSourceUrl
                      );
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>

                  {/* 上下文菜单 */}
                  {contextMenuSource === source.bookSourceUrl && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => handleCopy(source.bookSourceUrl)}
                      >
                        <Copy className="h-4 w-4" />
                        复制书源
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => handleExport(source.bookSourceUrl)}
                      >
                        <Download className="h-4 w-4" />
                        导出书源
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => setContextMenuSource(null)}
                      >
                        <CheckCircle className="h-4 w-4" />
                        在线验证
                      </button>
                      <div className="my-1 h-px bg-border" />
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(source.bookSourceUrl)}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除书源
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <p className="mb-4">暂无书源</p>
              <Button size="sm" onClick={handleCreate}>
                创建书源
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 底部工具栏 */}
      <div className="flex items-center justify-between border-t p-3">
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>新建书源</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleImport}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>导入书源</TooltipContent>
          </Tooltip>
        </div>
        <Button size="sm">
          <Save className="mr-2 h-4 w-4" />
          全部保存
        </Button>
      </div>
    </div>
  );
}

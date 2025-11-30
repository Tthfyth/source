import React from 'react';
import {
  Plus,
  FolderOpen,
  Save,
  RefreshCw,
  Settings,
  Sparkles,
  PanelLeft,
  Terminal,
  Code,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import { toast } from './ui/toast';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { cn } from '../lib/utils';

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
    createSource,
    importSources,
    saveCurrentSource,
    themeMode,
    setThemeMode,
  } = useBookSourceStore();

  const activeSource = sources.find(
    (s) => s.bookSourceUrl === activeSourceId
  );

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
          toast.success(`成功导入 ${count} 个书源`);
        } else {
          toast.error('导入失败，请检查文件格式');
        }
      }
      // 清理 input 元素
      input.remove();
    };
    input.click();
  };

  // 保存书源
  const handleSave = () => {
    if (saveCurrentSource()) {
      toast.success('保存成功');
    } else {
      toast.error('保存失败，请检查JSON格式');
    }
  };

  // 切换主题
  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex h-12 items-center justify-between border-b bg-card px-3">
      {/* 左侧操作按钮 */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isLeftCollapsed ? 'ghost' : 'secondary'}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleLeft}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>切换书源列表 (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <div className="flex gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCreate}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>新建书源</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleImport}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>导入书源</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSave}
                disabled={!isModified}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>保存 (Ctrl+S)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>测试所有书源</TooltipContent>
        </Tooltip>
      </div>

      {/* 中间标题 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Legado 书源调试器</span>
        {activeSource && (
          <>
            <span className="text-muted-foreground">-</span>
            <span className="text-muted-foreground">
              {activeSource.bookSourceName}
            </span>
            {isModified && (
              <span className="text-primary">●</span>
            )}
          </>
        )}
      </div>

      {/* 右侧操作按钮 */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={isAICollapsed ? 'ghost' : 'secondary'} 
              size="sm" 
              className="h-8 gap-1.5"
              onClick={onToggleAI}
            >
              <Sparkles className="h-4 w-4" />
              AI识别
            </Button>
          </TooltipTrigger>
          <TooltipContent>切换AI助手面板</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isBottomCollapsed ? 'ghost' : 'secondary'}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleBottom}
            >
              <Terminal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>切换控制台 (Ctrl+`)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isRightCollapsed ? 'ghost' : 'secondary'}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleRight}
            >
              <Code className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>切换调试面板 (Ctrl+Shift+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
            >
              {themeMode === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {themeMode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>设置</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

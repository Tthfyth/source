import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Code, Table, GitBranch, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { SourceFormEditor } from './SourceFormEditor';
import {
  basicFields,
  searchRuleFields,
  bookInfoRuleFields,
  tocRuleFields,
  contentRuleFields,
  searchUrlDoc,
  exploreUrlDoc,
  type FieldDoc,
} from '../lib/bookSourceSchema';

// 获取字段文档
function getFieldDocByKey(key: string, parentKey?: string): FieldDoc | null {
  // 直接匹配基本字段
  if (!parentKey) {
    if (key === 'searchUrl') return searchUrlDoc;
    if (key === 'exploreUrl') return exploreUrlDoc;
    if (basicFields[key]) return basicFields[key];
  }

  // 匹配嵌套字段
  switch (parentKey) {
    case 'ruleSearch':
    case 'ruleExplore':
      return searchRuleFields[key] || null;
    case 'ruleBookInfo':
      return bookInfoRuleFields[key] || null;
    case 'ruleToc':
      return tocRuleFields[key] || null;
    case 'ruleContent':
      return contentRuleFields[key] || null;
  }

  return null;
}

// 解析当前光标位置的字段路径
function getFieldAtPosition(code: string, position: number): { key: string; parent?: string } | null {
  // 找到当前行
  const beforeCursor = code.substring(0, position);
  const lines = beforeCursor.split('\n');
  const currentLine = lines[lines.length - 1];

  // 匹配 "fieldName": 格式
  const fieldMatch = currentLine.match(/"([^"]+)"\s*:/);
  if (!fieldMatch) return null;

  const fieldName = fieldMatch[1];

  // 查找父级对象
  let braceCount = 0;
  let parentKey: string | undefined;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    // 计算大括号
    for (const char of line) {
      if (char === '}') braceCount++;
      if (char === '{') braceCount--;
    }

    // 如果找到了一个未闭合的对象
    if (braceCount < 0) {
      const parentMatch = line.match(/"([^"]+)"\s*:\s*\{/);
      if (parentMatch) {
        parentKey = parentMatch[1];
        break;
      }
    }
  }

  return { key: fieldName, parent: parentKey };
}

export function CodeEditor() {
  const {
    sourceCode,
    activeSourceId,
    updateSourceCode,
    saveCurrentSource,
    createSource,
    editorViewMode,
    setEditorViewMode,
  } = useBookSourceStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    doc: FieldDoc | null;
  }>({ visible: false, x: 0, y: 0, doc: null });

  // 修复Electron中的焦点问题：点击容器时确保textarea获得焦点
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // 如果点击的不是textarea本身，手动聚焦
    if (e.target !== textareaRef.current && textareaRef.current) {
      // 使用setTimeout确保在事件处理完成后聚焦
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, []);

  // 格式化代码
  const formatCode = useCallback(() => {
    try {
      const formatted = JSON.stringify(JSON.parse(sourceCode), null, 2);
      updateSourceCode(formatted);
    } catch {
      // JSON 解析失败，不格式化
    }
  }, [sourceCode, updateSourceCode]);

  // 处理快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveCurrentSource();
    }
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      formatCode();
    }
    // Tab 键插入空格
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = sourceCode.substring(0, start) + '  ' + sourceCode.substring(end);
        updateSourceCode(newValue);
        // 设置光标位置
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  // 处理鼠标悬停
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // 获取鼠标在 textarea 中的位置
      const rect = textarea.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 估算光标位置（简化计算）
      const lineHeight = 24; // 大约行高
      const charWidth = 8.4; // 大约字符宽度
      const paddingTop = 16;
      const paddingLeft = 16;

      const lineIndex = Math.floor((y - paddingTop + textarea.scrollTop) / lineHeight);
      const charIndex = Math.floor((x - paddingLeft + textarea.scrollLeft) / charWidth);

      // 获取该行内容
      const lines = sourceCode.split('\n');
      if (lineIndex < 0 || lineIndex >= lines.length) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const line = lines[lineIndex];

      // 检查是否在字段名上
      const fieldMatch = line.match(/"([^"]+)"\s*:/);
      if (fieldMatch) {
        const fieldStart = line.indexOf('"' + fieldMatch[1] + '"');
        const fieldEnd = fieldStart + fieldMatch[1].length + 2;

        if (charIndex >= fieldStart && charIndex <= fieldEnd) {
          // 找到父级
          let braceCount = 0;
          let parentKey: string | undefined;

          for (let i = lineIndex; i >= 0; i--) {
            const prevLine = lines[i];
            for (let j = prevLine.length - 1; j >= 0; j--) {
              if (prevLine[j] === '}') braceCount++;
              if (prevLine[j] === '{') {
                braceCount--;
                if (braceCount < 0) {
                  const parentMatch = prevLine.match(/"([^"]+)"\s*:\s*\{/);
                  if (parentMatch) {
                    parentKey = parentMatch[1];
                  }
                  break;
                }
              }
            }
            if (braceCount < 0) break;
          }

          const doc = getFieldDocByKey(fieldMatch[1], parentKey);
          if (doc) {
            setTooltip({
              visible: true,
              x: e.clientX,
              y: e.clientY - 10,
              doc,
            });
            return;
          }
        }
      }

      setTooltip((prev) => ({ ...prev, visible: false }));
    },
    [sourceCode]
  );

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  if (!activeSourceId) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background">
        <p className="mb-4 text-muted-foreground">请选择或创建一个书源</p>
        <Button onClick={() => createSource()}>创建书源</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* 标签页头部 */}
      <div className="flex items-center justify-between border-b bg-card px-3">
        <Tabs
          value={editorViewMode}
          onValueChange={(v) =>
            setEditorViewMode(v as 'text' | 'visual' | 'table')
          }
        >
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger value="text" className="gap-1.5">
              <Code className="h-4 w-4" />
              文本视图
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5">
              <Table className="h-4 w-4" />
              表格视图
            </TabsTrigger>
            <TabsTrigger value="visual" className="gap-1.5">
              <GitBranch className="h-4 w-4" />
              可视化
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="ghost" size="sm" onClick={formatCode}>
          <Sparkles className="mr-2 h-4 w-4" />
          格式化
        </Button>
      </div>

      {/* 编辑器内容区 */}
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onClick={editorViewMode === 'text' ? handleContainerClick : undefined}
      >
        {editorViewMode === 'text' && (
          <div className="absolute inset-0 overflow-auto">
            <textarea
              ref={textareaRef}
              className="block min-h-full w-full resize-none border-0 bg-background p-4 font-mono text-sm leading-6 outline-none focus:outline-none focus:ring-0"
              value={sourceCode}
              onChange={(e) => updateSourceCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onFocus={() => {
                // 确保textarea在获得焦点时可以正常输入
                if (textareaRef.current) {
                  textareaRef.current.style.pointerEvents = 'auto';
                }
              }}
              spellCheck={false}
              placeholder="在此编辑书源 JSON..."
            />
          </div>
        )}

        {editorViewMode === 'table' && <SourceFormEditor />}

        {editorViewMode === 'visual' && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>可视化视图开发中...</p>
          </div>
        )}

        {/* 悬停提示框 */}
        {tooltip.visible && tooltip.doc && (
          <div
            className="pointer-events-none fixed z-50 max-w-md rounded-lg border bg-popover p-3 shadow-lg"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 80,
            }}
          >
            <div className="mb-1 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">
                {tooltip.doc.name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {tooltip.doc.description}
            </p>
            {tooltip.doc.example && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">示例: </span>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  {tooltip.doc.example}
                </code>
              </div>
            )}
            {tooltip.doc.tips && (
              <p className="mt-1 text-xs text-primary">{tooltip.doc.tips}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

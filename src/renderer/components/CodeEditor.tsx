import { useCallback, useRef, useState } from 'react';
import {
  Box,
  Group,
  Text,
  Button,
  SegmentedControl,
  Paper,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconCode,
  IconTable,
  IconGitBranch,
  IconSparkles,
  IconHelp,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import { SourceFormEditor } from './SourceFormEditor';
import { SourceVisualizer } from './SourceVisualizer';
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
  if (!parentKey) {
    if (key === 'searchUrl') return searchUrlDoc;
    if (key === 'exploreUrl') return exploreUrlDoc;
    if (basicFields[key]) return basicFields[key];
  }

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

  const { colorScheme } = useMantineColorScheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    doc: FieldDoc | null;
  }>({ visible: false, x: 0, y: 0, doc: null });

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== textareaRef.current && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, []);

  const formatCode = useCallback(() => {
    try {
      const formatted = JSON.stringify(JSON.parse(sourceCode), null, 2);
      updateSourceCode(formatted);
    } catch {
      // JSON 解析失败，不格式化
    }
  }, [sourceCode, updateSourceCode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveCurrentSource();
    }
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      formatCode();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = sourceCode.substring(0, start) + '  ' + sourceCode.substring(end);
        updateSourceCode(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const rect = textarea.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const lineHeight = 24;
      const charWidth = 8.4;
      const paddingTop = 16;
      const paddingLeft = 16;

      const lineIndex = Math.floor((y - paddingTop + textarea.scrollTop) / lineHeight);
      const charIndex = Math.floor((x - paddingLeft + textarea.scrollLeft) / charWidth);

      const lines = sourceCode.split('\n');
      if (lineIndex < 0 || lineIndex >= lines.length) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const line = lines[lineIndex];
      const fieldMatch = line.match(/"([^"]+)"\s*:/);
      if (fieldMatch) {
        const fieldStart = line.indexOf('"' + fieldMatch[1] + '"');
        const fieldEnd = fieldStart + fieldMatch[1].length + 2;

        if (charIndex >= fieldStart && charIndex <= fieldEnd) {
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
      <Box h="100%" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed" mb="md">请选择或创建一个书源</Text>
        <Button onClick={() => createSource()}>创建书源</Button>
      </Box>
    );
  }

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 标签页头部 */}
      <Group
        px="md"
        py="sm"
        gap="md"
        wrap="nowrap"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          width: '100%',
        })}
      >
        <SegmentedControl
          value={editorViewMode}
          onChange={(v) => setEditorViewMode(v as 'text' | 'visual' | 'table')}
          size="sm"
          style={{ flex: '0 0 80%' }}
          data={[
            { label: <Group gap={6}><IconCode size={16} /><span>文本</span></Group>, value: 'text' },
            { label: <Group gap={6}><IconTable size={16} /><span>表格</span></Group>, value: 'table' },
            { label: <Group gap={6}><IconGitBranch size={16} /><span>可视化</span></Group>, value: 'visual' },
          ]}
        />

        <Button variant="subtle" size="sm" leftSection={<IconSparkles size={16} />} onClick={formatCode} style={{ flex: '0 0 10%', minWidth: 'fit-content' }}>
          格式化
        </Button>
      </Group>

      {/* 编辑器内容区 */}
      <Box
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onClick={editorViewMode === 'text' ? handleContainerClick : undefined}
      >
        {editorViewMode === 'text' && (
          <Box style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
            <textarea
              ref={textareaRef}
              style={{
                display: 'block',
                minHeight: '100%',
                width: '100%',
                resize: 'none',
                border: 'none',
                backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-white)',
                color: colorScheme === 'dark' ? 'var(--mantine-color-gray-1)' : 'var(--mantine-color-dark-9)',
                padding: 16,
                fontFamily: 'var(--mantine-font-family-monospace)',
                fontSize: 13,
                lineHeight: 1.8,
                outline: 'none',
              }}
              value={sourceCode}
              onChange={(e) => updateSourceCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onFocus={() => {
                if (textareaRef.current) {
                  textareaRef.current.style.pointerEvents = 'auto';
                }
              }}
              spellCheck={false}
              placeholder="在此编辑书源 JSON..."
            />
          </Box>
        )}

        {editorViewMode === 'table' && (
          <Box style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
            <SourceFormEditor />
          </Box>
        )}

        {editorViewMode === 'visual' && (
          <Box style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
            <SourceVisualizer />
          </Box>
        )}

        {/* 悬停提示框 */}
        {tooltip.visible && tooltip.doc && (
          <Paper
            shadow="md"
            p="sm"
            withBorder
            style={{
              position: 'fixed',
              left: tooltip.x + 10,
              top: tooltip.y - 80,
              maxWidth: 400,
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <Group gap="xs" mb={4}>
              <IconHelp size={16} color="var(--mantine-color-teal-6)" />
              <Text size="sm" fw={600}>{tooltip.doc.name}</Text>
            </Group>
            <Text size="xs" c="dimmed">{tooltip.doc.description}</Text>
            {tooltip.doc.example && (
              <Box mt="xs">
                <Text size="xs" c="dimmed" component="span">示例: </Text>
                <Text
                  size="xs"
                  component="code"
                  style={{
                    backgroundColor: 'var(--mantine-color-gray-1)',
                    padding: '2px 4px',
                    borderRadius: 4,
                  }}
                >
                  {tooltip.doc.example}
                </Text>
              </Box>
            )}
            {tooltip.doc.tips && (
              <Text size="xs" c="teal" mt={4}>{tooltip.doc.tips}</Text>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { Box } from '@mantine/core';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { TopToolbar } from './TopToolbar';
import { SourceSidebar } from './SourceSidebar';
import { CodeEditor } from './CodeEditor';
import { DebugPanel } from './DebugPanel';
import { DebugConsole } from './DebugConsole';
import { AIChatPanel } from './AIChatPanel';

export function MainLayout() {
  // 面板折叠状态
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const [isAICollapsed, setIsAICollapsed] = useState(false);

  // 保存折叠前的尺寸
  const [savedLeftSize, setSavedLeftSize] = useState(250);
  const [savedRightSize, setSavedRightSize] = useState(320);
  const [savedBottomSize, setSavedBottomSize] = useState(200);
  const [savedAISize, setSavedAISize] = useState(320);

  // 当前尺寸
  const [leftSize, setLeftSize] = useState(250);
  const [rightSize, setRightSize] = useState(320);
  const [bottomSize, setBottomSize] = useState(200);
  const [aiSize, setAISize] = useState(320);

  // 切换面板
  const toggleLeft = useCallback(() => {
    if (isLeftCollapsed) {
      setLeftSize(savedLeftSize);
    } else {
      setSavedLeftSize(leftSize);
      setLeftSize(0);
    }
    setIsLeftCollapsed(!isLeftCollapsed);
  }, [isLeftCollapsed, leftSize, savedLeftSize]);

  const toggleRight = useCallback(() => {
    if (isRightCollapsed) {
      setRightSize(savedRightSize);
    } else {
      setSavedRightSize(rightSize);
      setRightSize(0);
    }
    setIsRightCollapsed(!isRightCollapsed);
  }, [isRightCollapsed, rightSize, savedRightSize]);

  const toggleBottom = useCallback(() => {
    if (isBottomCollapsed) {
      setBottomSize(savedBottomSize);
    } else {
      setSavedBottomSize(bottomSize);
      setBottomSize(0);
    }
    setIsBottomCollapsed(!isBottomCollapsed);
  }, [isBottomCollapsed, bottomSize, savedBottomSize]);

  const toggleAI = useCallback(() => {
    if (isAICollapsed) {
      setAISize(savedAISize);
    } else {
      setSavedAISize(aiSize);
      setAISize(0);
    }
    setIsAICollapsed(!isAICollapsed);
  }, [isAICollapsed, aiSize, savedAISize]);

  // 快捷键处理
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl+B: 切换左侧面板
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleLeft();
      }
      // Ctrl+Shift+D: 切换右侧面板
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleRight();
      }
      // Ctrl+`: 切换底部面板
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleBottom();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [toggleLeft, toggleRight, toggleBottom]);

  return (
    <Box h="100vh" w="100vw" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部工具栏 */}
      <TopToolbar
        isLeftCollapsed={isLeftCollapsed}
        isRightCollapsed={isRightCollapsed}
        isBottomCollapsed={isBottomCollapsed}
        isAICollapsed={isAICollapsed}
        onToggleLeft={toggleLeft}
        onToggleRight={toggleRight}
        onToggleBottom={toggleBottom}
        onToggleAI={toggleAI}
      />

      {/* 主内容区 */}
      <Box style={{ flex: 1, overflow: 'hidden' }}>
        <Allotment vertical>
          {/* 上部分：三栏布局 */}
          <Allotment.Pane minSize={200}>
            <Allotment>
              {/* 左侧边栏：书源列表 */}
              <Allotment.Pane
                minSize={0}
                preferredSize={leftSize}
                visible={!isLeftCollapsed}
              >
                <SourceSidebar />
              </Allotment.Pane>

              {/* 中央编辑区：代码编辑器 */}
              <Allotment.Pane minSize={300}>
                <CodeEditor />
              </Allotment.Pane>

              {/* 右侧调试面板：测试器 */}
              <Allotment.Pane
                minSize={0}
                preferredSize={rightSize}
                visible={!isRightCollapsed}
              >
                <DebugPanel />
              </Allotment.Pane>

              {/* AI 对话面板 */}
              <Allotment.Pane
                minSize={0}
                preferredSize={aiSize}
                visible={!isAICollapsed}
              >
                <AIChatPanel />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* 底部控制台：调试日志 */}
          <Allotment.Pane
            minSize={0}
            preferredSize={bottomSize}
            visible={!isBottomCollapsed}
          >
            <DebugConsole />
          </Allotment.Pane>
        </Allotment>
      </Box>
    </Box>
  );
}

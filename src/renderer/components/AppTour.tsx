import { useState, ReactNode } from 'react';
import { TourProvider, useTour } from '@reactour/tour';
import { Button, Group, Text, Stack, Badge, ThemeIcon, Box } from '@mantine/core';
import {
  IconRocket,
  IconBook,
  IconCode,
  IconBug,
  IconSparkles,
  IconDeviceFloppy,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconMessageChatbot,
  IconSettings,
  IconTransform,
} from '@tabler/icons-react';

// 本地存储 key
const TOUR_COMPLETED_KEY = 'app-tour-completed';

// 步骤内容组件
const StepContent = ({ step }: { step: number }) => {
  const contents = [
    // Step 0: 欢迎
    <Stack gap="sm" key={0}>
      <Group gap="xs">
        <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'teal', to: 'cyan' }}>
          <IconRocket size={20} />
        </ThemeIcon>
        <Text fw={600} size="lg">欢迎使用书源调试器</Text>
      </Group>
      <Text size="sm" c="dimmed">
        这是一个强大的 Legado / 异次元 书源调试工具，让我们快速了解核心功能。
      </Text>
      <Badge variant="light" color="teal" size="sm">预计 1 分钟</Badge>
    </Stack>,
    // Step 1: 书源管理
    <Stack gap="sm" key={1}>
      <Group gap="xs">
        <ThemeIcon size="md" radius="xl" color="blue">
          <IconBook size={16} />
        </ThemeIcon>
        <Text fw={600}>书源管理</Text>
      </Group>
      <Text size="sm" c="dimmed">在这里管理您的书源：</Text>
      <Stack gap={4}>
        <Text size="sm">• 点击 <strong>+</strong> 新建书源</Text>
        <Text size="sm">• 点击 <strong>📂</strong> 导入 JSON 文件</Text>
        <Text size="sm">• 点击书源名称切换编辑</Text>
        <Text size="sm">• 点击 <strong>全部保存</strong> 保存到文件</Text>
      </Stack>
    </Stack>,
    // Step 2: 图源转化
    <Stack gap="sm" key={2}>
      <Group gap="xs">
        <ThemeIcon size="md" radius="xl" color="cyan">
          <IconTransform size={16} />
        </ThemeIcon>
        <Text fw={600}>图源格式转化</Text>
        <Badge size="xs" variant="filled" color="cyan">新功能</Badge>
      </Group>
      <Text size="sm" c="dimmed">支持 Legado 和异次元格式互转：</Text>
      <Stack gap={4}>
        <Text size="sm">• 点击书源旁的 <strong>转化按钮</strong></Text>
        <Text size="sm">• <strong>Legado → 异次元</strong>：自动转换规则格式</Text>
        <Text size="sm">• <strong>异次元 → Legado</strong>：反向转换</Text>
        <Text size="sm">• 转化后可在两种阅读器中使用</Text>
      </Stack>
      <Box mt="xs" p="xs" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
        <Text size="xs" c="dimmed">💡 转化是幂等的，多次转化结果一致</Text>
      </Box>
    </Stack>,
    // Step 3: 编辑器
    <Stack gap="sm" key={3}>
      <Group gap="xs">
        <ThemeIcon size="md" radius="xl" color="violet">
          <IconCode size={16} />
        </ThemeIcon>
        <Text fw={600}>多模式编辑器</Text>
      </Group>
      <Text size="sm" c="dimmed">提供三种编辑模式：</Text>
      <Stack gap={4}>
        <Text size="sm">• <strong>文本</strong>：直接编辑 JSON 代码</Text>
        <Text size="sm">• <strong>表格</strong>：表单化编辑各字段</Text>
        <Text size="sm">• <strong>可视化</strong>：流程图展示规则结构</Text>
      </Stack>
      <Text size="xs" c="dimmed" mt={4}>💡 悬停字段名可查看帮助文档</Text>
    </Stack>,
    // Step 4: 调试面板
    <Stack gap="sm" key={4}>
      <Group gap="xs">
        <ThemeIcon size="md" radius="xl" color="orange">
          <IconBug size={16} />
        </ThemeIcon>
        <Text fw={600}>规则测试器</Text>
      </Group>
      <Text size="sm" c="dimmed">完整的调试流程：</Text>
      <Stack gap={4}>
        <Text size="sm">• <strong>搜索</strong>：测试关键词搜索</Text>
        <Text size="sm">• <strong>发现</strong>：测试分类浏览</Text>
        <Text size="sm">• <strong>详情/目录/正文</strong>：逐级测试</Text>
      </Stack>
      <Box mt="xs" p="xs" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
        <Text size="xs" c="dimmed">💡 右侧 <strong>AI 开关</strong>：开启后测试结果自动发送给 AI 分析</Text>
      </Box>
      <Text size="xs" c="dimmed">💡 点击结果可自动跳转下一步测试</Text>
    </Stack>,
    // Step 5: AI 助手面板
    <Stack gap="sm" key={5}>
      <Group gap="xs">
        <ThemeIcon size="md" radius="xl" variant="gradient" gradient={{ from: 'pink', to: 'grape' }}>
          <IconMessageChatbot size={16} />
        </ThemeIcon>
        <Text fw={600}>AI 助手面板</Text>
        <Badge size="xs" variant="filled" color="pink">重点功能</Badge>
      </Group>
      <Text size="sm" c="dimmed">智能分析与对话：</Text>
      <Stack gap={4}>
        <Text size="sm">• 输入<strong>网址</strong>自动识别书源规则</Text>
        <Text size="sm">• 测试结果自动发送给 AI 分析</Text>
        <Text size="sm">• AI 诊断规则问题并提供修复建议</Text>
        <Text size="sm">• 支持多轮对话，持续优化规则</Text>
      </Stack>
      <Box mt="xs" p="xs" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
        <Text size="xs" c="dimmed">💡 在输入框输入网站地址，AI 会自动分析页面结构生成规则</Text>
      </Box>
    </Stack>,
    // Step 6: AI 配置
    <Stack gap="sm" key={6}>
      <Group gap="xs">
        <ThemeIcon size="md" radius="xl" color="violet">
          <IconSettings size={16} />
        </ThemeIcon>
        <Text fw={600}>AI 服务配置</Text>
      </Group>
      <Text size="sm" c="dimmed">配置 AI 服务商：</Text>
      <Stack gap={4}>
        <Text size="sm">• 点击 AI 面板顶部<strong>设置图标</strong></Text>
        <Text size="sm">• 选择服务商（GitHub/DeepSeek/Kimi等）</Text>
        <Text size="sm">• 填入对应的 <strong>API Key</strong></Text>
        <Text size="sm">• 选择合适的模型</Text>
      </Stack>
      <Box mt="xs" p="xs" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
        <Text size="xs" c="dimmed">⚙️ 推荐使用 GitHub Copilot 或 DeepSeek，性价比高</Text>
      </Box>
    </Stack>,
    // Step 7: 保存
    <Stack gap="sm" key={7}>
      <Group gap="xs">
        <ThemeIcon size="md" radius="xl" color="teal">
          <IconDeviceFloppy size={16} />
        </ThemeIcon>
        <Text fw={600}>保存书源</Text>
      </Group>
      <Text size="sm" c="dimmed">编辑完成后记得保存：</Text>
      <Stack gap={4}>
        <Text size="sm">• <strong>Ctrl+S</strong> 快速保存当前书源</Text>
        <Text size="sm">• 点击此按钮保存到内存/文件</Text>
        <Text size="sm">• 右下角「全部保存」批量导出</Text>
      </Stack>
    </Stack>,
  ];
  return contents[step] || null;
};

// 引导步骤配置
const tourSteps = [
  { selector: '[data-tour="welcome"]', position: 'center' as const },
  { selector: '[data-tour="source-list"]', position: 'right' as const },
  { selector: '[data-tour="convert-btn"]', position: 'right' as const },  // 图源转化
  { selector: '[data-tour="editor"]', position: 'left' as const },
  { selector: '[data-tour="debug-panel"]', position: 'left' as const },
  { selector: '[data-tour="ai-toggle"]', position: 'bottom' as const },  // AI 助手面板
  { selector: '[data-tour="ai-settings"]', position: 'left' as const },  // AI 配置（设置按钮）
  { selector: '[data-tour="save-btn"]', position: 'bottom' as const },
];

// 自定义导航组件
function TourNavigation() {
  const { currentStep, setCurrentStep, steps, setIsOpen } = useTour();
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(currentStep - 1);
  };

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      setIsOpen(false);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <Group gap="xs">
        <Text size="xs" c="dimmed">
          {currentStep + 1} / {steps.length}
        </Text>
        {!isLast && (
          <Button variant="subtle" size="xs" color="gray" onClick={handleSkip}>
            跳过引导
          </Button>
        )}
      </Group>
      <Group gap="xs">
        {!isFirst && (
          <Button
            variant="default"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
            onClick={handlePrev}
          >
            上一步
          </Button>
        )}
        <Button
          variant="filled"
          size="xs"
          color="teal"
          rightSection={isLast ? <IconCheck size={14} /> : <IconArrowRight size={14} />}
          onClick={handleNext}
        >
          {isLast ? '开始使用' : '下一步'}
        </Button>
      </Group>
    </Group>
  );
}

// 引导内容包装器
function ContentComponent() {
  const { currentStep } = useTour();
  return (
    <Box>
      <StepContent step={currentStep} />
      <TourNavigation />
    </Box>
  );
}

// 检查是否首次启动
const shouldShowTour = () => {
  return !localStorage.getItem(TOUR_COMPLETED_KEY);
};

// Tour Provider 包装组件
export function AppTourProvider({ children }: { children: ReactNode }) {
  const stepsWithContent = tourSteps.map((step, index) => ({
    ...step,
    content: <StepContent step={index} />,
  }));

  // 计算初始状态
  const [initialOpen] = useState(() => shouldShowTour());

  return (
    <TourProvider
      steps={stepsWithContent}
      defaultOpen={initialOpen}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: '#1a1b1e',
          color: '#c1c2c5',
          borderRadius: 12,
          padding: 20,
          maxWidth: 360,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
        }),
        maskArea: (base) => ({
          ...base,
          rx: 8,
        }),
        maskWrapper: (base) => ({
          ...base,
          color: 'rgba(0, 0, 0, 0.7)',
        }),
        badge: () => ({
          display: 'none',
        }),
        controls: () => ({
          display: 'none',
        }),
        close: () => ({
          display: 'none',
        }),
      }}
      ContentComponent={ContentComponent}
      onClickMask={() => {}}
      padding={{ mask: 8, popover: [16, 12] }}
      showNavigation={false}
      showBadge={false}
      showCloseButton={false}
    >
      {children}
    </TourProvider>
  );
}

// 手动触发引导的 Hook
export function useAppTour() {
  const tour = useTour();

  const startTour = () => {
    tour.setCurrentStep(0);
    tour.setIsOpen(true);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    startTour();
  };

  return {
    startTour,
    resetTour,
    isOpen: tour.isOpen,
  };
}

// 导出重置函数供外部使用
export const resetAppTour = () => {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
};

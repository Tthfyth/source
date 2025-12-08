import { useMemo, useState } from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  Paper,
  Badge,
  Collapse,
  ActionIcon,
  ScrollArea,
  Tooltip,
  Code,
  CopyButton,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconChevronRight,
  IconChevronDown,
  IconWorld,
  IconSearch,
  IconCompass,
  IconBook,
  IconList,
  IconFileText,
  IconSettings,
  IconKey,
  IconCode,
  IconCheck,
  IconCopy,
  IconAlertCircle,
  IconCircleCheck,
  IconCircleDashed,
} from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import type { BookSource, AnySource } from '../types';
import { detectSourceFormat, SourceFormat } from '../types';

// 规则分组配置
interface RuleGroup {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  fields: { key: string; name: string; important?: boolean }[];
  namespace?: string;
}

const legadoRuleGroups: RuleGroup[] = [
  {
    key: 'basic',
    name: '基本信息',
    icon: <IconSettings size={16} />,
    color: 'blue',
    fields: [
      { key: 'bookSourceUrl', name: '书源地址', important: true },
      { key: 'bookSourceName', name: '书源名称', important: true },
      { key: 'bookSourceGroup', name: '书源分组' },
      { key: 'bookSourceType', name: '书源类型' },
      { key: 'bookSourceComment', name: '书源说明' },
      { key: 'enabled', name: '是否启用' },
      { key: 'enabledExplore', name: '启用发现' },
      { key: 'header', name: '请求头' },
      { key: 'jsLib', name: 'JS库' },
    ],
  },
  {
    key: 'login',
    name: '登录配置',
    icon: <IconKey size={16} />,
    color: 'orange',
    fields: [
      { key: 'loginUrl', name: '登录地址' },
      { key: 'loginUi', name: '登录UI' },
      { key: 'loginCheckJs', name: '登录检测JS' },
    ],
  },
  {
    key: 'search',
    name: '搜索规则',
    icon: <IconSearch size={16} />,
    color: 'teal',
    fields: [
      { key: 'searchUrl', name: '搜索地址', important: true },
    ],
  },
  {
    key: 'ruleSearch',
    name: '搜索解析',
    icon: <IconSearch size={16} />,
    color: 'teal',
    namespace: 'ruleSearch',
    fields: [
      { key: 'bookList', name: '书籍列表', important: true },
      { key: 'name', name: '书名规则', important: true },
      { key: 'author', name: '作者规则' },
      { key: 'intro', name: '简介规则' },
      { key: 'kind', name: '分类规则' },
      { key: 'lastChapter', name: '最新章节' },
      { key: 'coverUrl', name: '封面规则' },
      { key: 'bookUrl', name: '详情地址', important: true },
    ],
  },
  {
    key: 'explore',
    name: '发现规则',
    icon: <IconCompass size={16} />,
    color: 'grape',
    fields: [
      { key: 'exploreUrl', name: '发现地址', important: true },
    ],
  },
  {
    key: 'ruleExplore',
    name: '发现解析',
    icon: <IconCompass size={16} />,
    color: 'grape',
    namespace: 'ruleExplore',
    fields: [
      { key: 'bookList', name: '书籍列表' },
      { key: 'name', name: '书名规则' },
      { key: 'author', name: '作者规则' },
      { key: 'intro', name: '简介规则' },
      { key: 'kind', name: '分类规则' },
      { key: 'lastChapter', name: '最新章节' },
      { key: 'coverUrl', name: '封面规则' },
      { key: 'bookUrl', name: '详情地址' },
    ],
  },
  {
    key: 'ruleBookInfo',
    name: '详情规则',
    icon: <IconBook size={16} />,
    color: 'cyan',
    namespace: 'ruleBookInfo',
    fields: [
      { key: 'init', name: '预处理规则' },
      { key: 'name', name: '书名规则' },
      { key: 'author', name: '作者规则' },
      { key: 'intro', name: '简介规则' },
      { key: 'kind', name: '分类规则' },
      { key: 'lastChapter', name: '最新章节' },
      { key: 'coverUrl', name: '封面规则' },
      { key: 'tocUrl', name: '目录地址', important: true },
    ],
  },
  {
    key: 'ruleToc',
    name: '目录规则',
    icon: <IconList size={16} />,
    color: 'indigo',
    namespace: 'ruleToc',
    fields: [
      { key: 'chapterList', name: '章节列表', important: true },
      { key: 'chapterName', name: '章节名称', important: true },
      { key: 'chapterUrl', name: '章节地址', important: true },
      { key: 'isVolume', name: '卷标识' },
      { key: 'updateTime', name: '更新时间' },
      { key: 'nextTocUrl', name: '下一页目录' },
    ],
  },
  {
    key: 'ruleContent',
    name: '正文规则',
    icon: <IconFileText size={16} />,
    color: 'pink',
    namespace: 'ruleContent',
    fields: [
      { key: 'content', name: '正文内容', important: true },
      { key: 'nextContentUrl', name: '下一页正文' },
      { key: 'replaceRegex', name: '替换规则' },
      { key: 'imageStyle', name: '图片样式' },
      { key: 'webJs', name: 'WebView JS' },
    ],
  },
];

// 规则值显示组件
function RuleValue({ value, maxLength = 100 }: { value: any; maxLength?: number }) {
  const { colorScheme } = useMantineColorScheme();
  
  if (value === undefined || value === null || value === '') {
    return <Text size="xs" c="dimmed" fs="italic">未配置</Text>;
  }

  const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const displayValue = strValue.length > maxLength ? strValue.substring(0, maxLength) + '...' : strValue;
  const isLong = strValue.length > maxLength;

  // 检测规则类型
  const getRuleType = (val: string): { type: string; color: string } => {
    if (val.startsWith('@js:') || val.startsWith('<js>')) return { type: 'JS', color: 'yellow' };
    if (val.startsWith('$.') || val.startsWith('@json:')) return { type: 'JSON', color: 'blue' };
    if (val.startsWith('//') || val.startsWith('@xpath:')) return { type: 'XPath', color: 'grape' };
    if (val.startsWith('@css:') || val.includes('class.') || val.includes('tag.')) return { type: 'CSS', color: 'teal' };
    if (val.includes('{{') && val.includes('}}')) return { type: '模板', color: 'orange' };
    if (val.startsWith('http://') || val.startsWith('https://')) return { type: 'URL', color: 'cyan' };
    return { type: '文本', color: 'gray' };
  };

  const ruleType = getRuleType(strValue);

  return (
    <Group gap={4} wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
      <Badge size="xs" variant="light" color={ruleType.color}>
        {ruleType.type}
      </Badge>
      <Tooltip label={strValue} disabled={!isLong} multiline w={400} position="bottom-start">
        <Code
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 11,
            padding: '2px 6px',
            backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-1)',
          }}
        >
          {displayValue}
        </Code>
      </Tooltip>
      <CopyButton value={strValue}>
        {({ copied, copy }) => (
          <ActionIcon size="xs" variant="subtle" onClick={copy} color={copied ? 'teal' : 'gray'}>
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          </ActionIcon>
        )}
      </CopyButton>
    </Group>
  );
}

// 规则组展开组件
function RuleGroupPanel({ group, source }: { group: RuleGroup; source: any }) {
  const [expanded, setExpanded] = useState(true);
  const { colorScheme } = useMantineColorScheme();

  // 获取字段值
  const getFieldValue = (fieldKey: string) => {
    if (group.namespace) {
      return source[group.namespace]?.[fieldKey];
    }
    return source[fieldKey];
  };

  // 统计已配置的字段数
  const configuredCount = group.fields.filter(f => {
    const val = getFieldValue(f.key);
    return val !== undefined && val !== null && val !== '';
  }).length;

  const totalCount = group.fields.length;
  const hasConfig = configuredCount > 0;

  return (
    <Paper
      withBorder
      mb="xs"
      style={{
        borderColor: hasConfig
          ? `var(--mantine-color-${group.color}-${colorScheme === 'dark' ? '8' : '3'})`
          : undefined,
        borderLeftWidth: 3,
        borderLeftColor: `var(--mantine-color-${group.color}-6)`,
      }}
    >
      <Group
        px="sm"
        py="xs"
        justify="space-between"
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Group gap="xs">
          <Box c={`${group.color}.6`}>{group.icon}</Box>
          <Text size="sm" fw={500}>{group.name}</Text>
          <Badge size="xs" variant="light" color={hasConfig ? group.color : 'gray'}>
            {configuredCount}/{totalCount}
          </Badge>
        </Group>
        <ActionIcon variant="subtle" size="sm">
          {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </ActionIcon>
      </Group>

      <Collapse in={expanded}>
        <Stack gap={0} px="sm" pb="sm">
          {group.fields.map((field) => {
            const value = getFieldValue(field.key);
            const hasValue = value !== undefined && value !== null && value !== '';

            return (
              <Group
                key={field.key}
                gap="sm"
                py={4}
                wrap="nowrap"
                style={(theme) => ({
                  borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                })}
              >
                <Group gap={4} w={100} style={{ flexShrink: 0 }}>
                  {hasValue ? (
                    <IconCircleCheck size={12} color="var(--mantine-color-teal-6)" />
                  ) : (
                    <IconCircleDashed size={12} color="var(--mantine-color-gray-5)" />
                  )}
                  <Text
                    size="xs"
                    fw={field.important ? 600 : 400}
                    c={hasValue ? undefined : 'dimmed'}
                  >
                    {field.name}
                  </Text>
                </Group>
                <RuleValue value={value} />
              </Group>
            );
          })}
        </Stack>
      </Collapse>
    </Paper>
  );
}

// 流程图节点组件
function FlowNode({
  icon,
  title,
  subtitle,
  color,
  status,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  color: string;
  status: 'configured' | 'partial' | 'empty';
  onClick?: () => void;
}) {
  const { colorScheme } = useMantineColorScheme();

  const statusColors = {
    configured: 'teal',
    partial: 'yellow',
    empty: 'gray',
  };

  return (
    <Paper
      withBorder
      p="sm"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderColor: `var(--mantine-color-${statusColors[status]}-${colorScheme === 'dark' ? '7' : '4'})`,
        borderWidth: 2,
        minWidth: 120,
        textAlign: 'center',
      }}
      onClick={onClick}
    >
      <Box c={`${color}.6`} mb={4}>{icon}</Box>
      <Text size="sm" fw={600}>{title}</Text>
      {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
      <Badge size="xs" variant="light" color={statusColors[status]} mt={4}>
        {status === 'configured' ? '已配置' : status === 'partial' ? '部分配置' : '未配置'}
      </Badge>
    </Paper>
  );
}

// 连接线组件
function FlowArrow() {
  return (
    <Box px="xs" style={{ display: 'flex', alignItems: 'center' }}>
      <Box
        style={{
          width: 30,
          height: 2,
          backgroundColor: 'var(--mantine-color-gray-4)',
          position: 'relative',
        }}
      >
        <Box
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            width: 0,
            height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderLeft: '8px solid var(--mantine-color-gray-4)',
          }}
        />
      </Box>
    </Box>
  );
}

export function SourceVisualizer() {
  const { sourceCode, activeSourceId } = useBookSourceStore();
  const { colorScheme } = useMantineColorScheme();
  const [viewMode, setViewMode] = useState<'flow' | 'tree'>('flow');

  // 解析当前书源
  const currentSource = useMemo<AnySource | null>(() => {
    if (!sourceCode) return null;
    try {
      return JSON.parse(sourceCode);
    } catch {
      return null;
    }
  }, [sourceCode]);

  // 检测源格式
  const sourceFormat = useMemo(() => {
    return currentSource ? detectSourceFormat(currentSource) : SourceFormat.Legado;
  }, [currentSource]);

  // 计算各模块状态
  const getModuleStatus = (namespace?: string, requiredFields?: string[]) => {
    if (!currentSource) return 'empty';
    const source = currentSource as any;
    
    if (namespace) {
      const nsObj = source[namespace];
      if (!nsObj) return 'empty';
      
      const fields = Object.values(nsObj).filter(v => v !== undefined && v !== null && v !== '');
      if (fields.length === 0) return 'empty';
      
      if (requiredFields) {
        const hasRequired = requiredFields.every(f => nsObj[f]);
        return hasRequired ? 'configured' : 'partial';
      }
      return 'configured';
    }
    return 'empty';
  };

  if (!activeSourceId) {
    return (
      <Box h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed">请选择一个书源</Text>
      </Box>
    );
  }

  if (!currentSource) {
    return (
      <Box h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Group gap="xs">
          <IconAlertCircle size={20} color="var(--mantine-color-red-6)" />
          <Text c="red">JSON 格式错误</Text>
        </Group>
      </Box>
    );
  }

  const source = currentSource as BookSource;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 头部 */}
      <Group
        px="md"
        py="xs"
        justify="space-between"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          flexShrink: 0,
        })}
      >
        <Group gap="xs">
          <IconWorld size={16} />
          <Text size="sm" fw={600}>{source.bookSourceName || '未命名书源'}</Text>
          <Badge size="xs" variant="light" color={sourceFormat === SourceFormat.Yiciyuan ? 'grape' : 'blue'}>
            {sourceFormat === SourceFormat.Yiciyuan ? '异次元' : 'Legado'}
          </Badge>
        </Group>
        <Group gap={4}>
          <Badge
            size="sm"
            variant={viewMode === 'flow' ? 'filled' : 'light'}
            style={{ cursor: 'pointer' }}
            onClick={() => setViewMode('flow')}
          >
            流程图
          </Badge>
          <Badge
            size="sm"
            variant={viewMode === 'tree' ? 'filled' : 'light'}
            style={{ cursor: 'pointer' }}
            onClick={() => setViewMode('tree')}
          >
            规则树
          </Badge>
        </Group>
      </Group>

      {/* 内容区 */}
      <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {viewMode === 'flow' ? (
          /* 流程图视图 */
          <Box p="md">
            <Text size="sm" fw={500} mb="md" c="dimmed">书源解析流程</Text>
            
            {/* 搜索/发现流程 */}
            <Paper withBorder p="md" mb="md">
              <Text size="xs" fw={500} c="dimmed" mb="sm">入口</Text>
              <Group gap={0} wrap="nowrap" style={{ overflowX: 'auto' }}>
                <FlowNode
                  icon={<IconSearch size={24} />}
                  title="搜索"
                  subtitle={source.searchUrl ? '已配置' : '未配置'}
                  color="teal"
                  status={source.searchUrl ? 'configured' : 'empty'}
                />
                <FlowArrow />
                <FlowNode
                  icon={<IconCode size={24} />}
                  title="搜索解析"
                  color="teal"
                  status={getModuleStatus('ruleSearch', ['bookList', 'name', 'bookUrl'])}
                />
              </Group>
              
              <Box my="sm" />
              
              <Group gap={0} wrap="nowrap" style={{ overflowX: 'auto' }}>
                <FlowNode
                  icon={<IconCompass size={24} />}
                  title="发现"
                  subtitle={source.exploreUrl ? '已配置' : '未配置'}
                  color="grape"
                  status={source.exploreUrl ? 'configured' : 'empty'}
                />
                <FlowArrow />
                <FlowNode
                  icon={<IconCode size={24} />}
                  title="发现解析"
                  color="grape"
                  status={getModuleStatus('ruleExplore', ['bookList'])}
                />
              </Group>
            </Paper>

            {/* 详情 -> 目录 -> 正文 */}
            <Paper withBorder p="md">
              <Text size="xs" fw={500} c="dimmed" mb="sm">阅读流程</Text>
              <Group gap={0} wrap="nowrap" style={{ overflowX: 'auto' }}>
                <FlowNode
                  icon={<IconBook size={24} />}
                  title="书籍详情"
                  color="cyan"
                  status={getModuleStatus('ruleBookInfo', ['tocUrl'])}
                />
                <FlowArrow />
                <FlowNode
                  icon={<IconList size={24} />}
                  title="目录"
                  color="indigo"
                  status={getModuleStatus('ruleToc', ['chapterList', 'chapterName', 'chapterUrl'])}
                />
                <FlowArrow />
                <FlowNode
                  icon={<IconFileText size={24} />}
                  title="正文"
                  color="pink"
                  status={getModuleStatus('ruleContent', ['content'])}
                />
              </Group>
            </Paper>

            {/* 统计信息 */}
            <Paper withBorder p="md" mt="md">
              <Text size="xs" fw={500} c="dimmed" mb="sm">配置统计</Text>
              <Group gap="md">
                {legadoRuleGroups.map(group => {
                  const source_ = currentSource as any;
                  const getVal = (key: string) => group.namespace ? source_[group.namespace]?.[key] : source_[key];
                  const configured = group.fields.filter(f => {
                    const v = getVal(f.key);
                    return v !== undefined && v !== null && v !== '';
                  }).length;
                  
                  return (
                    <Tooltip key={group.key} label={`${group.name}: ${configured}/${group.fields.length}`}>
                      <Badge
                        variant="light"
                        color={configured === group.fields.length ? 'teal' : configured > 0 ? group.color : 'gray'}
                        leftSection={group.icon}
                      >
                        {configured}/{group.fields.length}
                      </Badge>
                    </Tooltip>
                  );
                })}
              </Group>
            </Paper>
          </Box>
        ) : (
          /* 规则树视图 */
          <Box p="md">
            {legadoRuleGroups.map(group => (
              <RuleGroupPanel key={group.key} group={group} source={currentSource} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

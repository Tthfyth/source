import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Switch,
  Select,
  Tabs,
  Tooltip,
  Badge,
  useMantineColorScheme,
} from '@mantine/core';
import { IconChevronDown, IconHelp } from '@tabler/icons-react';
import { useBookSourceStore } from '../stores/bookSourceStore';
import bookSourceEditConfig, { type FieldConfig, type SourceEditConfig } from '../lib/bookSourceEditConfig';
import yiciyuanSourceEditConfig from '../lib/yiciyuanSourceEditConfig';
import type { BookSource, AnySource } from '../types';
import { detectSourceFormat, SourceFormat, getSourceFormatLabel } from '../types';

// 书源类型选项
const SOURCE_TYPES = ['文本', '音频', '图片', '文件'];

interface FormFieldProps {
  field: FieldConfig;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}

// 表单字段组件
function FormField({ field, value, onChange }: FormFieldProps) {
  const { type, title, hint, array, required, id } = field;
  const { colorScheme } = useMantineColorScheme();

  return (
    <Group gap="md" mb="sm" align="flex-start" wrap="nowrap">
      <Box w={140} style={{ flexShrink: 0 }} pt={8}>
        <Group gap={4} wrap="nowrap">
          <Text size="sm" fw={500}>
            {title}
            {required && <Text component="span" c="red">*</Text>}
          </Text>
          {hint && (
            <Tooltip label={hint} position="right" multiline w={200}>
              <IconHelp size={14} style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }} />
            </Tooltip>
          )}
        </Group>
        <Text size="xs" c="dimmed">{id}</Text>
      </Box>

      <Box style={{ flex: 1 }}>
        {type === 'String' && (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder={hint}
            autosize
            minRows={1}
            maxRows={6}
            size="sm"
          />
        )}

        {type === 'Boolean' && (
          <Switch
            checked={!!value}
            onChange={(e) => onChange(e.currentTarget.checked)}
            size="md"
          />
        )}

        {type === 'Number' && (
          <NumberInput
            value={(value as number) ?? 0}
            onChange={(val) => onChange(val || 0)}
            min={0}
            size="sm"
            w={120}
          />
        )}

        {type === 'Array' && array && (
          <Select
            value={String((value as number) ?? 0)}
            onChange={(val) => onChange(parseInt(val || '0'))}
            data={array.map((option, index) => ({ value: String(index), label: option }))}
            size="sm"
          />
        )}
      </Box>
    </Group>
  );
}

export function SourceFormEditor() {
  const { sourceCode, updateSourceCode, activeSourceId, createSource } =
    useBookSourceStore();
  const { colorScheme } = useMantineColorScheme();

  const [activeTab, setActiveTab] = useState<string | null>('base');

  // 解析当前书源
  const currentSource = useMemo<AnySource | null>(() => {
    if (!sourceCode) return null;
    try {
      return JSON.parse(sourceCode);
    } catch {
      return null;
    }
  }, [sourceCode]);

  // 检测当前源格式
  const sourceFormat = useMemo(() => {
    return currentSource ? detectSourceFormat(currentSource) : SourceFormat.Legado;
  }, [currentSource]);

  // 根据源格式选择编辑配置
  const editConfig = useMemo<SourceEditConfig>(() => {
    return sourceFormat === SourceFormat.Yiciyuan 
      ? yiciyuanSourceEditConfig 
      : bookSourceEditConfig;
  }, [sourceFormat]);

  // 更新字段值
  const updateField = useCallback(
    (field: FieldConfig, value: string | number | boolean) => {
      if (!currentSource) return;

      const newSource = JSON.parse(JSON.stringify(currentSource));

      if (field.namespace) {
        if (!newSource[field.namespace] || typeof newSource[field.namespace] !== 'object') {
          newSource[field.namespace] = {};
        }
        newSource[field.namespace][field.id] = value;
      } else {
        newSource[field.id] = value;
      }

      updateSourceCode(JSON.stringify(newSource, null, 2));
    },
    [currentSource, updateSourceCode]
  );

  // 获取字段值
  const getFieldValue = useCallback(
    (field: FieldConfig): string | number | boolean | undefined => {
      if (!currentSource) return undefined;

      const source = currentSource as any;

      if (field.namespace) {
        const nsObj = source[field.namespace];
        if (nsObj && typeof nsObj === 'object') {
          return nsObj[field.id];
        }
        return undefined;
      }

      return source[field.id];
    },
    [currentSource]
  );

  if (!activeSourceId) {
    return (
      <Box h="100%" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed" mb="md">请选择或创建一个书源</Text>
        <Button onClick={() => createSource()}>创建书源</Button>
      </Box>
    );
  }

  if (!currentSource) {
    return (
      <Box h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="red">JSON 格式错误，请切换到文本视图修复</Text>
      </Box>
    );
  }

  const tabs = Object.entries(editConfig);

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 源格式标签 */}
      <Group
        px="md"
        py="xs"
        style={(theme) => ({
          borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          flexShrink: 0,
        })}
      >
        <Badge
          size="sm"
          variant="light"
          color={sourceFormat === SourceFormat.Yiciyuan ? 'grape' : 'blue'}
        >
          {sourceFormat === SourceFormat.Yiciyuan ? '异次元图源' : 'Legado 书源'}
        </Badge>
        <Text size="xs" c="dimmed">
          {currentSource?.bookSourceName || '未命名'}
        </Text>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Tabs.List
          style={(theme) => ({
            borderBottom: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
            backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
            flexShrink: 0,
          })}
        >
          {tabs.map(([key, config]) => (
            <Tabs.Tab key={key} value={key}>
              {config.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {tabs.map(([key, config]) => (
            <Tabs.Panel key={key} value={key} style={{ height: '100%' }}>
              <Box p="md">
                {config.children.map((field) => (
                  <FormField
                    key={`${field.namespace || ''}-${field.id}`}
                    field={field}
                    value={getFieldValue(field)}
                    onChange={(value) => updateField(field, value)}
                  />
                ))}
              </Box>
            </Tabs.Panel>
          ))}
        </Box>
      </Tabs>
    </Box>
  );
}

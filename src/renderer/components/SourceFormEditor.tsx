import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import { useBookSourceStore } from '../stores/bookSourceStore';
import bookSourceEditConfig, { type FieldConfig } from '../lib/bookSourceEditConfig';
import type { BookSource } from '../types';
import { cn } from '../lib/utils';

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

  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex w-36 shrink-0 flex-col gap-0.5 pt-2">
        <div className="flex items-center gap-1">
          <label className="text-sm font-medium text-foreground">
            {title}
            {required && <span className="text-destructive">*</span>}
          </label>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{id}</span>
      </div>

      <div className="flex-1">
        {type === 'String' && (
          <textarea
            className="min-h-[36px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => e.currentTarget.focus()}
            onMouseDown={(e) => {
              // 阻止事件冒泡，防止父组件抢占焦点
              e.stopPropagation();
            }}
            placeholder={hint}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        )}

        {type === 'Boolean' && (
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20" />
          </label>
        )}

        {type === 'Number' && (
          <Input
            type="number"
            value={(value as number) ?? 0}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            onClick={(e) => e.currentTarget.focus()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-32"
            min={0}
          />
        )}

        {type === 'Array' && array && (
          <div className="relative">
            <select
              value={(value as number) ?? 0}
              onChange={(e) => onChange(parseInt(e.target.value))}
              onClick={(e) => e.currentTarget.focus()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {array.map((option, index) => (
                <option key={option} value={index}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SourceFormEditor() {
  const { sourceCode, updateSourceCode, activeSourceId, createSource } =
    useBookSourceStore();

  const [activeTab, setActiveTab] = useState('base');

  // 解析当前书源
  const currentSource = useMemo<BookSource | null>(() => {
    if (!sourceCode) return null;
    try {
      return JSON.parse(sourceCode);
    } catch {
      return null;
    }
  }, [sourceCode]);

  // 更新字段值
  const updateField = useCallback(
    (field: FieldConfig, value: string | number | boolean) => {
      if (!currentSource) return;

      // 深拷贝
      const newSource = JSON.parse(JSON.stringify(currentSource));

      if (field.namespace) {
        // 嵌套字段
        if (!newSource[field.namespace] || typeof newSource[field.namespace] !== 'object') {
          newSource[field.namespace] = {};
        }
        newSource[field.namespace][field.id] = value;
      } else {
        // 顶级字段
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <div className="flex h-full flex-col items-center justify-center bg-background">
        <p className="mb-4 text-muted-foreground">请选择或创建一个书源</p>
        <Button onClick={() => createSource()}>创建书源</Button>
      </div>
    );
  }

  if (!currentSource) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-destructive">JSON 格式错误，请切换到文本视图修复</p>
      </div>
    );
  }

  const tabs = Object.entries(bookSourceEditConfig);

  return (
    <div className="flex h-full flex-col bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <div className="shrink-0 border-b bg-card px-2">
          <TabsList className="h-10 w-full justify-start gap-0 bg-transparent p-0">
            {tabs.map(([key, config]) => (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  'relative h-10 rounded-none border-b-2 border-transparent px-4 font-medium',
                  'data-[state=active]:border-primary data-[state=active]:text-primary'
                )}
              >
                {config.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {tabs.map(([key, config]) => (
            <TabsContent
              key={key}
              value={key}
              className="m-0 h-full data-[state=inactive]:hidden"
            >
              <div className="h-full overflow-auto">
                <div className="p-4">
                  {config.children.map((field) => (
                    <FormField
                      key={`${field.namespace || ''}-${field.id}`}
                      field={field}
                      value={getFieldValue(field)}
                      onChange={(value) => updateField(field, value)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Toast 状态管理
let toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

const notify = () => {
  listeners.forEach((listener) => listener([...toasts]));
};

export const toast = {
  success: (message: string) => {
    const id = Math.random().toString(36).substring(2);
    toasts.push({ id, message, type: 'success' });
    notify();
    setTimeout(() => toast.dismiss(id), 3000);
  },
  error: (message: string) => {
    const id = Math.random().toString(36).substring(2);
    toasts.push({ id, message, type: 'error' });
    notify();
    setTimeout(() => toast.dismiss(id), 4000);
  },
  info: (message: string) => {
    const id = Math.random().toString(36).substring(2);
    toasts.push({ id, message, type: 'info' });
    notify();
    setTimeout(() => toast.dismiss(id), 3000);
  },
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  },
};

// Toast 容器组件
export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setCurrentToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setCurrentToasts);
    };
  }, []);

  if (currentToasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {currentToasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => toast.dismiss(t.id)} />
      ))}
    </div>,
    document.body
  );
}

// 单个 Toast 组件
function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-full',
        bgColors[t.type]
      )}
    >
      {icons[t.type]}
      <span className="text-sm font-medium">{t.message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

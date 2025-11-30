import { useEffect } from 'react';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/toast';
import { MainLayout } from './components/MainLayout';
import { useBookSourceStore } from './stores/bookSourceStore';
import './styles/globals.css';

export default function App() {
  const { themeMode } = useBookSourceStore();

  // 修复 Electron 中的焦点问题
  useEffect(() => {
    // 当窗口获得焦点时，确保可以正常输入
    const handleWindowFocus = () => {
      // 延迟一下确保焦点状态稳定
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
          (activeElement as HTMLElement).blur();
          (activeElement as HTMLElement).focus();
        }
      }, 50);
    };

    // 监听点击事件，确保输入元素可以获得焦点
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        // 强制聚焦
        setTimeout(() => {
          target.focus();
        }, 0);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  // 初始化主题
  useEffect(() => {
    // 检测系统主题偏好
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    // 默认使用浅色模式
    if (themeMode === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      // system
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  return (
    <TooltipProvider delayDuration={300}>
      <MainLayout />
      <Toaster />
    </TooltipProvider>
  );
}

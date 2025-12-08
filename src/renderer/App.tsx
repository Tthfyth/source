import { useEffect } from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { MainLayout } from './components/MainLayout';
import { AppTourProvider } from './components/AppTour';
import { useBookSourceStore } from './stores/bookSourceStore';
import { theme } from './theme';

// Mantine 样式
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';

// 自定义样式
import './styles/globals.css';

export default function App() {
  const { themeMode, setThemeMode } = useBookSourceStore();

  // 修复 Electron 中的焦点问题
  useEffect(() => {
    const handleWindowFocus = () => {
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
          (activeElement as HTMLElement).blur();
          (activeElement as HTMLElement).focus();
        }
      }, 50);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
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

  // 获取 Mantine 颜色方案
  const colorScheme = themeMode === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : themeMode;

  // 监听系统主题变化
  useEffect(() => {
    if (themeMode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // 强制重新渲染
      setThemeMode('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, setThemeMode]);

  return (
    <>
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
        <Notifications position="top-right" />
        <AppTourProvider>
          <MainLayout />
        </AppTourProvider>
      </MantineProvider>
    </>
  );
}

import { createTheme, MantineColorsTuple } from '@mantine/core';

// 自定义绿色主题色（与原项目保持一致）
const primaryGreen: MantineColorsTuple = [
  '#e6fff5',
  '#d0f9e8',
  '#a3f2d0',
  '#72ebb5',
  '#4ae49f',
  '#30e090',
  '#1fde87',
  '#0bc475',
  '#00ae67',
  '#009757',
];

export const theme = createTheme({
  // 主色调
  primaryColor: 'teal',
  primaryShade: { light: 6, dark: 7 },
  
  // 字体
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'Consolas, Monaco, "Courier New", monospace',
  
  // 圆角
  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  
  // 间距
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },
  
  // 组件默认属性
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
        variant: 'subtle',
      },
    },
    Tabs: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
    ScrollArea: {
      defaultProps: {
        scrollbarSize: 8,
      },
    },
  },
  
  // 其他配置
  cursorType: 'pointer',
  focusRing: 'auto',
  respectReducedMotion: true,
  
  // 自定义颜色
  colors: {
    brand: primaryGreen,
  },
});

# 书源调试器 (Legado Source Debugger)

一个用于调试和管理 Legado / 异次元 书源的桌面应用程序。

## 功能特性

- **多格式支持**：同时支持 Legado 书源和异次元图源
- **格式互转**：支持 Legado ↔ 异次元格式一键转换，转换后可在两种阅读器中使用
- **可视化编辑**：提供文本、表格、可视化三种编辑模式
- **规则调试**：支持搜索、发现、详情、目录、正文的完整调试流程
- **AI 辅助**：集成 AI 助手，帮助分析和修复书源规则
- **实时预览**：调试结果实时可视化展示

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd source

# 安装依赖
pnpm install
```

## 开发

```bash
# 启动开发环境
pnpm start
```

## 打包

```bash
# 打包应用
pnpm run package
```

## 使用指南

### 1. 书源管理

**导入书源**
- 点击左侧边栏底部的 📂 按钮导入 JSON 格式的书源文件
- 支持单个书源或书源数组

**新建书源**
- 点击左侧边栏底部的 ➕ 按钮创建新书源
- 支持创建 Legado 书源或异次元图源

**保存书源**
- `Ctrl+S`：保存当前编辑的书源
- 点击「全部保存」按钮：保存所有书源到文件

### 2. 图源格式转换

支持 Legado 书源和异次元图源之间的双向转换：

**使用方法**
- 点击工具栏的 🔄 转换按钮
- 自动检测当前格式并转换为另一种格式

**转换规则**
| Legado 字段 | 异次元字段 |
|------------|-----------|
| `searchUrl` | `ruleSearchUrl` |
| `ruleSearch.bookList` | `ruleSearchList` |
| `ruleSearch.name` | `ruleSearchName` |
| `ruleSearch.bookUrl` | `ruleSearchNoteUrl` |
| `ruleBookInfo.name` | `ruleBookInfoName` |
| `ruleToc.chapterList` | `ruleChapterList` |
| `ruleContent.content` | `ruleContentUrlContent` |

**特性**
- 转换是幂等的：多次转换结果一致
- 保留 `@Header:{}` 后缀等特殊语法
- 自动转换占位符：`{{key}}` ↔ `searchKey`

### 3. 编辑模式

**文本视图**
- 直接编辑书源 JSON 代码
- 支持 `Ctrl+B` 格式化代码
- 悬停字段名显示帮助文档

**表格视图**
- 表单化编辑书源字段
- 按分类组织：基本信息、搜索规则、发现规则、详情规则、目录规则、正文规则

**可视化视图**
- 流程图展示书源解析流程
- 规则树展示所有配置项及状态
- 快速查看规则类型（JS/JSON/XPath/CSS）

### 4. 规则测试器

**测试模式**
- **搜索**：输入关键词测试搜索功能
- **发现**：选择发现分类测试发现功能
- **详情**：输入书籍 URL 测试详情解析
- **目录**：输入目录 URL 测试章节列表解析
- **正文**：输入章节 URL 测试正文内容解析

**测试流程**
1. 选择测试模式
2. 输入测试参数（关键词或 URL）
3. 点击「测试」按钮
4. 查看结果：可视化 / 解析结果 / 原始响应

**快捷操作**
- 搜索结果点击书籍 → 自动跳转详情测试
- 详情页点击「查看目录」→ 自动跳转目录测试
- 目录点击章节 → 自动跳转正文测试

### 5. 调试控制台

- 查看请求日志、解析日志、错误信息
- 支持按类别过滤日志
- 支持清空日志

### 6. AI 助手

- 开启「AI」开关后，测试结果会附加到 AI 对话
- AI 可以帮助分析规则问题并提供修复建议
- 支持配置多个 AI 服务商（GitHub Copilot、DeepSeek、Kimi 等）
- 输入网址可自动分析页面结构生成规则

## 支持的规则语法

### Legado 书源

| 规则类型 | 语法示例 |
|---------|---------|
| JSONPath | `$.data.list[*]` |
| CSS 选择器 | `div.book-item` |
| XPath | `//div[@class='item']` |
| 正则表达式 | `:regex:pattern` |
| JavaScript | `@js:code` 或 `<js>code</js>` |
| 模板变量 | `{{key}}`, `{{page}}` |

### 异次元图源

| 规则类型 | 语法示例 |
|---------|---------|
| JSONPath | `$.data[*]` |
| CSS/JSoup | `div.item@text` |
| 正则 | `regex:pattern` |
| JavaScript | `js:code` |

## 项目结构

```
src/
├── main/                 # Electron 主进程
│   ├── debug/           # 书源调试核心
│   │   ├── source-debugger.ts    # Legado 调试器
│   │   ├── yiciyuan-debugger.ts  # 异次元调试器
│   │   ├── rule-parser.ts        # 规则解析器
│   │   ├── analyze-url.ts        # URL 分析器
│   │   ├── http-client.ts        # HTTP 请求客户端
│   │   ├── cache-manager.ts      # 缓存管理
│   │   └── cookie-manager.ts     # Cookie 管理
│   ├── ai/              # AI 服务集成
│   └── services/        # 服务层
│       └── puppeteer-service.ts  # Puppeteer 浏览器服务
├── renderer/            # React 渲染进程
│   ├── components/      # UI 组件
│   ├── stores/          # 状态管理
│   ├── utils/           # 工具函数
│   │   └── sourceConverter.ts    # 图源格式转换器
│   └── types/           # 类型定义
```

## 快捷键

| 快捷键 | 功能 |
|-------|------|
| `Ctrl+S` | 保存当前书源 |
| `Ctrl+B` | 格式化 JSON |
| `Ctrl+O` | 打开文件 |
| `Enter` | 执行测试（在输入框中） |

## 技术栈

- **框架**：Electron + React + TypeScript
- **UI 库**：Mantine UI
- **状态管理**：Zustand
- **解析库**：Cheerio, JSONPath-Plus

## 开源声明

本项目为**完全开源项目**，遵循 MIT 许可证。

- 源代码完全公开，可自由查看、修改和分发
- 欢迎提交 Issue 和 Pull Request
- 可用于个人学习、商业项目等任何用途

## License

MIT

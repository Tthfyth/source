/**
 * 书源规则知识注入器
 * 让 AI 先学习书源规则体系再回答问题
 * 支持分步教学和动态知识库更新
 */

import * as fs from 'fs';
import * as path from 'path';
import { app, ipcMain } from 'electron';

interface RuleExample {
  website: string;
  type: string;
  html_snippet: string;
  generated_rule: any;
}

interface ExampleLibrary {
  examples: RuleExample[];
}

// 经验教训记录
interface LessonLearned {
  date: string;
  website: string;
  ruleType: string;
  wrongSelector: string;
  correctSelector: string;
  reason: string;
}

// 分步分析结果
interface StepAnalysis {
  step: number;
  name: string;
  result: any;
}

class RuleKnowledgeInjector {
  private knowledgeBase: string | null = null;
  private exampleLibrary: ExampleLibrary | null = null;
  private lessonsLearned: LessonLearned[] = [];
  private initialized: boolean = false;
  private lessonsPath: string = '';

  constructor() {
    this.loadKnowledge();
    this.setupIpcListeners();
  }

  /**
   * 设置 IPC 监听器，接收用户修正
   */
  private setupIpcListeners() {
    // 监听用户手动修正规则
    ipcMain.on('user-corrected-rule', (_event, data: {
      original: any;
      corrected: any;
      url: string;
      ruleType: string;
    }) => {
      this.learnFromCorrection(data);
    });
  }

  /**
   * 从用户修正中学习
   */
  private learnFromCorrection(data: {
    original: any;
    corrected: any;
    url: string;
    ruleType: string;
  }) {
    try {
      const diff = this.compareRules(data.original, data.corrected);
      if (diff.length === 0) return;

      for (const d of diff) {
        const lesson: LessonLearned = {
          date: new Date().toISOString(),
          website: data.url,
          ruleType: data.ruleType || d.field,
          wrongSelector: d.oldValue,
          correctSelector: d.newValue,
          reason: this.inferReason(d.oldValue, d.newValue),
        };

        this.lessonsLearned.push(lesson);
        console.log('[AI学习] 记录修正:', lesson);
      }

      // 保存到文件
      this.saveLessons();
    } catch (error) {
      console.error('学习修正失败:', error);
    }
  }

  /**
   * 比较两个规则的差异
   */
  private compareRules(original: any, corrected: any): Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }> {
    const diffs: Array<{ field: string; oldValue: string; newValue: string }> = [];

    const compare = (obj1: any, obj2: any, prefix = '') => {
      if (!obj1 || !obj2) return;

      for (const key of Object.keys(obj2)) {
        const path = prefix ? `${prefix}.${key}` : key;
        const val1 = obj1[key];
        const val2 = obj2[key];

        if (typeof val2 === 'object' && val2 !== null && !Array.isArray(val2)) {
          compare(val1 || {}, val2, path);
        } else if (val1 !== val2 && typeof val2 === 'string') {
          diffs.push({
            field: path,
            oldValue: String(val1 || ''),
            newValue: val2,
          });
        }
      }
    };

    compare(original, corrected);
    return diffs;
  }

  /**
   * 推断修正原因
   */
  private inferReason(oldValue: string, newValue: string): string {
    if (!oldValue && newValue) return '原规则为空，需要添加选择器';
    if (oldValue && !newValue) return '原规则多余，需要删除';
    
    // 分析选择器类型变化
    const oldType = this.detectSelectorType(oldValue);
    const newType = this.detectSelectorType(newValue);
    
    if (oldType !== newType) {
      return `选择器类型从 ${oldType} 改为 ${newType}`;
    }
    
    // 分析具体变化
    if (newValue.includes('@text') && !oldValue.includes('@text')) {
      return '需要获取文本内容';
    }
    if (newValue.includes('@href') && !oldValue.includes('@href')) {
      return '需要获取链接地址';
    }
    if (newValue.includes('##') && !oldValue.includes('##')) {
      return '需要正则净化内容';
    }
    
    return '选择器路径不正确';
  }

  /**
   * 检测选择器类型
   */
  private detectSelectorType(selector: string): string {
    if (!selector) return 'empty';
    if (selector.startsWith('@css:')) return 'CSS';
    if (selector.startsWith('//') || selector.startsWith('@xpath:')) return 'XPath';
    if (selector.startsWith('$.') || selector.startsWith('@json:')) return 'JSONPath';
    if (selector.startsWith(':')) return 'Regex';
    return 'Default';
  }

  /**
   * 保存经验教训到文件
   */
  private saveLessons() {
    try {
      if (!this.lessonsPath) {
        const userDataPath = app?.getPath?.('userData') || '.';
        this.lessonsPath = path.join(userDataPath, 'ai-lessons.json');
      }

      fs.writeFileSync(this.lessonsPath, JSON.stringify(this.lessonsLearned, null, 2));
    } catch (error) {
      console.error('保存经验教训失败:', error);
    }
  }

  /**
   * 加载经验教训
   */
  private loadLessons() {
    try {
      const userDataPath = app?.getPath?.('userData') || '.';
      this.lessonsPath = path.join(userDataPath, 'ai-lessons.json');

      if (fs.existsSync(this.lessonsPath)) {
        const content = fs.readFileSync(this.lessonsPath, 'utf-8');
        this.lessonsLearned = JSON.parse(content);
        console.log(`[AI] 加载了 ${this.lessonsLearned.length} 条经验教训`);
      }
    } catch (error) {
      console.error('加载经验教训失败:', error);
    }
  }

  /**
   * 预加载知识库到内存
   */
  private async loadKnowledge() {
    try {
      // 获取资源路径
      const basePath = app?.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../assets');

      // 加载知识库
      const knowledgePath = path.join(basePath, 'rule-knowledge-base.md');
      if (fs.existsSync(knowledgePath)) {
        this.knowledgeBase = fs.readFileSync(knowledgePath, 'utf-8');
      } else {
        // 使用内置的精简知识库
        this.knowledgeBase = this.getBuiltinKnowledge();
      }

      // 加载示例库
      const examplesPath = path.join(basePath, 'rule-examples.json');
      if (fs.existsSync(examplesPath)) {
        const content = fs.readFileSync(examplesPath, 'utf-8');
        this.exampleLibrary = JSON.parse(content);
      } else {
        this.exampleLibrary = this.getBuiltinExamples();
      }

      // 加载经验教训
      this.loadLessons();

      this.initialized = true;
      console.log('规则知识库加载完成');
    } catch (error) {
      console.error('加载知识库失败:', error);
      // 使用内置知识
      this.knowledgeBase = this.getBuiltinKnowledge();
      this.exampleLibrary = this.getBuiltinExamples();
      this.initialized = true;
    }
  }

  /**
   * 构建分步教学式 Prompt（适用于复杂网站）
   * 将分析过程拆分为多个步骤，逐步引导 AI
   */
  buildStepByStepPrompts(pageContent: {
    url: string;
    title: string;
    html?: string;
    sections?: Array<{ name: string; selector: string; html: string }>;
    pageType?: 'search' | 'detail' | 'toc' | 'content' | 'unknown';
  }): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // 系统提示
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(),
    });

    // 第一步：分析网站结构类型
    messages.push({
      role: 'assistant',
      content: `【第一步】请分析网站的结构类型：
1. 网站类型：小说/漫画/有声/综合
2. 当前页面类型：搜索结果/书籍详情/目录列表/正文内容
3. 页面特征：是否有分页、是否需要登录、是否是动态加载`,
    });

    messages.push({
      role: 'user',
      content: `网站URL: ${pageContent.url}
网站标题: ${pageContent.title}
${pageContent.pageType ? `页面类型提示: ${pageContent.pageType}` : ''}

请分析这个页面的类型和特征。`,
    });

    // 第二步：识别关键元素
    messages.push({
      role: 'assistant',
      content: `【第二步】识别页面中的关键元素：
1. 列表容器：包含多个项目的父元素
2. 标题元素：书名/章节名的位置
3. 链接元素：跳转链接的位置
4. 其他信息：作者、简介、封面等`,
    });

    // 提供 HTML 片段
    let htmlInfo = '';
    if (pageContent.sections && pageContent.sections.length > 0) {
      htmlInfo = pageContent.sections
        .map(s => `【${s.name}】\n选择器: ${s.selector}\n${s.html.slice(0, 2000)}`)
        .join('\n\n');
    } else if (pageContent.html) {
      htmlInfo = pageContent.html.slice(0, 8000);
    }

    messages.push({
      role: 'user',
      content: `HTML 结构片段：
${htmlInfo}

请识别上述 HTML 中的关键元素，标注它们的选择器路径。`,
    });

    // 第三步：生成规则
    messages.push({
      role: 'assistant',
      content: `【第三步】根据分析结果生成完整的书源规则：
1. 使用合适的选择器语法（CSS/XPath/Default）
2. 处理分页（nextUrl）
3. 处理特殊情况（编码、动态加载等）
4. 添加正则净化规则`,
    });

    // 添加经验教训（如果有相关的）
    const relevantLessons = this.getRelevantLessons(pageContent.url);
    if (relevantLessons.length > 0) {
      messages.push({
        role: 'user',
        content: `【历史经验】以下是之前在类似网站上的修正记录，请参考避免同样的错误：
${relevantLessons.map(l => `- ${l.ruleType}: "${l.wrongSelector}" 应改为 "${l.correctSelector}"，原因：${l.reason}`).join('\n')}`,
      });
    }

    messages.push({
      role: 'user',
      content: `请根据以上分析，生成完整的 Legado 书源规则 JSON。`,
    });

    return messages;
  }

  /**
   * 获取相关的经验教训
   */
  private getRelevantLessons(url: string): LessonLearned[] {
    if (this.lessonsLearned.length === 0) return [];

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // 匹配相同域名或相似网站的教训
      return this.lessonsLearned
        .filter(lesson => {
          try {
            const lessonDomain = new URL(lesson.website).hostname;
            return domain.includes(lessonDomain) || 
                   lessonDomain.includes(domain) ||
                   this.isSimilarSite(domain, lessonDomain);
          } catch {
            return false;
          }
        })
        .slice(-5); // 最多返回5条最近的
    } catch {
      return [];
    }
  }

  /**
   * 判断是否是相似类型的网站
   */
  private isSimilarSite(domain1: string, domain2: string): boolean {
    // 常见小说网站关键词
    const novelKeywords = ['novel', 'book', 'read', 'txt', 'shuba', 'biquge', 'xbiquge', 'qu', 'shu'];
    
    const hasKeyword = (domain: string) => 
      novelKeywords.some(kw => domain.toLowerCase().includes(kw));
    
    return hasKeyword(domain1) && hasKeyword(domain2);
  }

  /**
   * 获取经验教训摘要（用于系统提示）
   */
  getLessonsSummary(): string {
    if (this.lessonsLearned.length === 0) return '';

    // 按规则类型分组统计
    const stats: Record<string, number> = {};
    const recentLessons = this.lessonsLearned.slice(-20);

    for (const lesson of recentLessons) {
      const key = lesson.ruleType;
      stats[key] = (stats[key] || 0) + 1;
    }

    let summary = '\n<lessons-learned>\n';
    summary += '以下是从用户修正中学到的经验：\n';
    
    for (const [type, count] of Object.entries(stats)) {
      summary += `- ${type}: ${count} 次修正\n`;
    }

    // 添加最近的具体教训
    const recent = recentLessons.slice(-3);
    if (recent.length > 0) {
      summary += '\n最近的修正案例：\n';
      for (const l of recent) {
        summary += `- "${l.wrongSelector}" → "${l.correctSelector}" (${l.reason})\n`;
      }
    }

    summary += '</lessons-learned>\n';
    return summary;
  }

  /**
   * 内置精简知识库
   */
  private getBuiltinKnowledge(): string {
    return `# Legado 书源规则速查

## 选择器语法
1. **JSOUP Default**: \`class.name.0@tag.a@text\`，用@分隔
2. **CSS**: 以\`@css:\`开头，如\`@css:.book-list li@text\`
3. **XPath**: 以\`//\`开头，如\`//div[@class="content"]/text()\`
4. **JSONPath**: 以\`$.\`开头，如\`$.data.books[*].title\`
5. **正则AllInOne**: 以\`:\`开头，只用于列表，如\`:<a href="([^"]*)">\`

## 连接符
- \`&&\` 合并结果
- \`||\` 取第一个有效值
- \`%%\` 交替取值

## 书源结构
\`\`\`json
{
  "bookSourceUrl": "https://example.com",
  "bookSourceName": "源名称",
  "searchUrl": "/search?key={{key}}&page={{page}}",
  "ruleSearch": {
    "bookList": "列表选择器",
    "name": "书名选择器",
    "author": "作者选择器",
    "bookUrl": "详情链接选择器"
  },
  "ruleBookInfo": {
    "name": "书名", "author": "作者",
    "intro": "简介", "tocUrl": "目录链接"
  },
  "ruleToc": {
    "chapterList": "章节列表",
    "chapterName": "章节名",
    "chapterUrl": "章节链接"
  },
  "ruleContent": {
    "content": "正文选择器"
  }
}
\`\`\`

## 常用模式
- 搜索列表: \`@css:.search-list li\` 或 \`//ul[@class="list"]/li\`
- 获取文本: \`@text\` 或 \`/text()\`
- 获取链接: \`@href\` 或 \`/@href\`
- 获取图片: \`@src\` 或 \`/@src\`
- 正则净化: \`##广告文字##\`（替换为空）

## 特殊处理
- 动态页面: URL后加\`,{"webView":true}\`
- GBK编码: \`,{"charset":"gbk"}\`
- POST请求: \`,{"method":"POST","body":"key={{key}}"}\``;
  }

  /**
   * 内置示例库（来自实际可用书源）
   */
  private getBuiltinExamples(): ExampleLibrary {
    return {
      examples: [
        {
          website: "69shuba",
          type: "Default",
          html_snippet: "<div class=\"newbox\"><li><a href=\"/book/123\">书名</a><span>作者：xxx</span></li></div>",
          generated_rule: {
            bookSourceName: "69书吧",
            bookSourceUrl: "https://www.69shuba.com",
            searchUrl: "/modules/article/search.php,{\"method\":\"POST\",\"body\":\"searchkey={{key}}\",\"charset\":\"gbk\"}",
            ruleSearch: {
              bookList: "class.newbox@tag.li",
              name: "tag.a.0@text",
              author: "tag.span.-1@text##.*：",
              bookUrl: "tag.a.0@href"
            },
            ruleToc: {
              chapterList: "id.catalog@tag.li",
              chapterName: "tag.a@text",
              chapterUrl: "tag.a@href"
            },
            ruleContent: {
              content: "class.txtnav@html"
            }
          }
        },
        {
          website: "biquge",
          type: "CSS",
          html_snippet: "<div id=\"list\"><dd><a href=\"/1.html\">第一章</a></dd></div>",
          generated_rule: {
            bookSourceName: "笔趣阁",
            ruleSearch: {
              bookList: "@css:.result-list .result-item",
              name: "@css:.result-game-item-title-link@text",
              author: "@css:.result-game-item-info-tag:nth-child(1)@text##作\\s*者：",
              bookUrl: "@css:.result-game-item-title-link@href"
            },
            ruleToc: {
              chapterList: "@css:#list dd a",
              chapterName: "@text",
              chapterUrl: "@href"
            },
            ruleContent: {
              content: "@css:#content@html"
            }
          }
        },
        {
          website: "xbiquge",
          type: "XPath",
          html_snippet: "<div id=\"info\"><h1>书名</h1><p>作者：xxx</p></div>",
          generated_rule: {
            bookSourceName: "新笔趣阁",
            ruleSearch: {
              bookList: "//div[@class=\"result-item\"]",
              name: "//h3/a/text()",
              author: "//p[@class=\"result-game-item-info-tag\"][1]/span[2]/text()",
              bookUrl: "//h3/a/@href"
            },
            ruleBookInfo: {
              name: "//div[@id=\"info\"]/h1/text()",
              author: "//div[@id=\"info\"]/p[1]/a/text()",
              intro: "//div[@id=\"intro\"]/p/text()"
            },
            ruleToc: {
              chapterList: "//div[@id=\"list\"]/dl/dd/a",
              chapterName: "/text()",
              chapterUrl: "/@href"
            },
            ruleContent: {
              content: "//div[@id=\"content\"]"
            }
          }
        }
      ]
    };
  }

  /**
   * 构建完整的系统提示词
   */
  buildSystemPrompt(): string {
    // 获取经验教训摘要
    const lessonsSummary = this.getLessonsSummary();

    return `你是一个专业的 Legado/异次元 书源规则生成专家。

<knowledge-base>
${this.knowledgeBase}
</knowledge-base>
${lessonsSummary}
<critical-requirements>
1. 输出必须是有效的 Legado JSON 格式
2. 每个选择器需要有明确的来源依据
3. 优先使用 CSS 选择器，其次 XPath，最后正则
4. 若不确定，标注 confidence 字段（0-1）
5. 动态网站需包含 webView: true
6. 绝对禁止虚构不存在的元素路径
7. 必须基于提供的 HTML 结构分析，不要凭空想象
8. 参考历史经验教训，避免重复犯错
</critical-requirements>

<output-format>
返回 JSON 格式的书源规则，包含：
- ruleSearch: 搜索规则
- ruleBookInfo: 详情规则  
- ruleToc: 目录规则
- ruleContent: 正文规则
- confidence: 整体可信度 (0-1)
- explain: 规则说明
</output-format>`;
  }

  /**
   * 构建包含知识的完整对话上下文
   */
  buildFullContext(
    userMessage: string,
    pageContent?: {
      url: string;
      title: string;
      html?: string;  // 完整页面HTML
      sections?: Array<{ name: string; selector: string; html: string }>;  // 关键区域
      features?: any;
      samples?: any;
      // 兼容旧接口
      selectors?: Record<string, string>;
      structure?: Record<string, string>;
    },
    chatHistory?: Array<{ role: string; content: string }>
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // 1. 系统提示词（包含知识库）
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt()
    });

    // 2. Few-Shot 示例（如果有相关的）
    if (pageContent?.url) {
      const relevantExamples = this.getRelevantExamples(pageContent.url);
      for (const example of relevantExamples) {
        messages.push({
          role: 'user',
          content: `为网站生成规则，HTML片段：${example.html_snippet}`
        });
        messages.push({
          role: 'assistant',
          content: JSON.stringify(example.generated_rule, null, 2)
        });
      }
    }

    // 3. 添加历史对话（保留最近的消息，避免 token 过多）
    if (chatHistory && chatHistory.length > 0) {
      const recentHistory = chatHistory
        .filter(m => m.role !== 'system')
        .slice(-10); // 最多保留10条历史
      messages.push(...recentHistory);
    }

    // 4. 当前任务
    let taskContent = userMessage;
    
    if (pageContent) {
      // 构建页面信息
      let pageInfo = `网站URL: ${pageContent.url}\n网站标题: ${pageContent.title}\n\n`;
      
      // 优先使用新格式（完整HTML + 关键区域）
      if (pageContent.html) {
        pageInfo += `【完整页面HTML】\n${pageContent.html.slice(0, 25000)}\n\n`;
      }
      
      if (pageContent.sections && pageContent.sections.length > 0) {
        pageInfo += `【关键区域】\n`;
        for (const section of pageContent.sections) {
          pageInfo += `\n--- ${section.name} (${section.selector}) ---\n${section.html.slice(0, 3000)}\n`;
        }
        pageInfo += '\n';
      }
      
      // 兼容旧格式
      if (pageContent.selectors && Object.keys(pageContent.selectors).length > 0) {
        pageInfo += `【选择器路径】\n${JSON.stringify(pageContent.selectors, null, 2)}\n\n`;
      }
      
      if (pageContent.structure && Object.keys(pageContent.structure).length > 0) {
        pageInfo += `【HTML结构片段】\n${JSON.stringify(pageContent.structure, null, 2)}\n\n`;
      }
      
      if (pageContent.features) {
        pageInfo += `【网站特征】\n${JSON.stringify(pageContent.features, null, 2)}\n\n`;
      }
      
      if (pageContent.samples) {
        pageInfo += `【示例数据】\n${JSON.stringify(pageContent.samples, null, 2)}\n\n`;
      }

      taskContent = `${pageInfo}用户要求：${userMessage}`;
    }

    messages.push({
      role: 'user',
      content: taskContent
    });

    return messages;
  }

  /**
   * 智能匹配相关案例
   */
  private getRelevantExamples(url: string): RuleExample[] {
    if (!this.exampleLibrary) return [];

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      return this.exampleLibrary.examples
        .filter(ex => 
          domain.includes(ex.website) || 
          ex.website.includes(domain) ||
          ex.type.toLowerCase().includes('css') // 默认返回 CSS 示例
        )
        .slice(0, 2); // 最多2个案例，节省 token
    } catch {
      return this.exampleLibrary.examples.slice(0, 1);
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// 单例
let knowledgeInjector: RuleKnowledgeInjector | null = null;

export function getKnowledgeInjector(): RuleKnowledgeInjector {
  if (!knowledgeInjector) {
    knowledgeInjector = new RuleKnowledgeInjector();
  }
  return knowledgeInjector;
}

export { RuleKnowledgeInjector, LessonLearned, StepAnalysis };

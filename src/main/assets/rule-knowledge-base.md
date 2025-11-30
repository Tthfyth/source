# Legado 书源规则完整说明


## 1、语法说明

### JSOUP之Default（推荐优先使用）

**Default 是 Legado 的原生语法，不需要任何前缀，是最简洁高效的写法。**

语法规则：
- `@` 为分隔符，用来分隔获取规则
- 每段规则可分为3段：**类型.名称.位置**
- 第一段是类型：`class`, `id`, `tag`, `text`, `children`
  - `children` 获取所有子标签，不需要第二段和第三段
  - `text` 可以根据文本内容获取
- 第二段是名称，text时第二段为文本内容的一部分
- 第三段是位置，class/tag/id等会获取到多个，所以要加位置
  - 不加位置会获取所有
  - 位置正着数从0开始，0是第一个
  - 负数则是倒数，-1为倒数第一个，-2为倒数第二个
- `!` 是排除，用`:` 隔开序号，如 `!0:2` 排除第1和第3个
- 获取列表最前面加 `-` 可使列表倒置
- `@` 最后一段为获取内容：`text`, `textNodes`, `ownText`, `href`, `src`, `html`, `all`，或任意HTML属性名
- 正则替换：`##正则表达式##替换内容`，替换内容为空时第二个##可省略

**数组写法**：
- 格式：`[index,index,...]` 或 `[!index,...]`（!开头表示排除）
- 区间格式：`[start:end]` 或 `[start:end:step]`
- start为0可省略，end为-1可省略
- 特殊用法：`tag.div[-1:0]` 可让列表反向
- 允许索引作为@分段后每个部分的首规则，此时相当于前面是children
  - `head@.1@text` 与 `head@[1]@text` 与 `head@children[1]@text` 等价

示例：
```
class.odd.0@tag.a.0@text
class.booknav2@tag.h1@text
id.catalog@tag.li
tag.a@href
tag.img@src
tag.img@data-original
class.content@html##<script[\s\S]*?</script>
```

### JSOUP之CSS（仅在需要复杂选择器时使用）

- **必须以 `@css:` 开头**
- 适用于需要CSS伪类选择器（如 `:nth-child`）或复杂层级选择的场景
- 获取内容可用：`text`, `textNodes`, `ownText`, `html`, `all`, `href`, `src`

示例：
```
@css:.book-list li@text
@css:#content p@textNodes
@css:.result-item .title a@href
@css:p:nth-child(2)@text
```

### 何时使用 Default vs CSS

| 场景 | 推荐语法 | 示例 |
|------|----------|------|
| 简单类名/ID选择 | Default | `class.content@text` |
| 标签选择 | Default | `tag.a@href` |
| 获取属性 | Default | `tag.img@data-original` |
| 需要 :nth-child | CSS | `@css:p:nth-child(2)@text` |
| 复杂层级选择 | CSS | `@css:.info > p.author@text` |
| 多类名组合 | CSS | `@css:.item.active@text` |

**原则：能用 Default 就用 Default，更简洁、性能更好。**

### JSONPath

- 最好以 `@json:` 或 `$.` 开头
- 语法参考 JsonPath 标准

示例：
```
$.data.books[*]
$..title
$.info.Datas[0].name
$..books[*].title
```

### XPath

- 必须以 `@XPath:` 或 `//` 开头

示例：
```
//div[@class="content"]/text()
//*[@property="og:novel:book_name"]/@content
//ul[@id="list"]/li/a
//*[@id="info"]/h1/text()
```

### JavaScript

- 可在 `<js></js>` 或 `@js:` 中使用，结果存在 `result` 中
- `@js:` 只能放在其他规则的最后使用
- `<js></js>` 可在任意位置使用，还能作为分隔符
- 在搜索列表、发现列表和目录中使用可以用 `+` 开头，使用AllInOne规则

示例：
```javascript
// 在规则末尾使用
tag.a@href@js:result + ",{\"webView\":true}"

// 作为分隔符
tag.li<js>result</js>//a

// 显示js报错信息
(function(result){
  try {
    // 处理result
    return result;
  } catch(e) {
    return "" + e;
  }
})(result);
```

### 正则之AllInOne

- 只能在搜索列表、发现列表、详情页预加载和目录列表中使用
- 必须以 `:` 开头
- 前面加 `-` 可使列表倒序

示例：
```
:<a[^>]+href="([^"]*)"[^>]*>([^<]*)
-:<li><a[^"]+\"([^\"]*)\"[^>]*>([^<]*)
```
其中 `$1` 是第一个捕获组（chapterUrl），`$2` 是第二个（chapterName）

### 正则之OnlyOne

- 形式：`##正则表达式##替换内容###`
- 只能在搜索列表、发现列表、详情页预加载、目录列表之外使用
- 只获取第一个匹配结果并进行替换

示例：
```
##:author\"[^\"]+\"([^\"]*)##$1###
##og:image\"[^\"]+\"([^\"]*)##$1###
```

### 正则之净化

- 形式：`##正则表达式##替换内容`
- 只能跟在其他规则后面，循环匹配替换
- 独立使用相当于 `all##正则表达式##替换内容`

示例：
```
@css:#content@html##<script[\s\S]*?</script>##
class.content@html##广告文字|请收藏.*
tag.span.-1@text##.*：
```

---

## 2、连接符号

- `&&` 合并所有取到的值
- `||` 以第一个取到值的为准
- `%%` 依次取数（列表1第一个→列表2第一个→列表3第一个→列表1第二个...）

只能在同种规则间使用，不包括js和正则。

---

## 3、Legado的特殊规则

### URL必知必会

**请求头**：
```javascript
{
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9"
}
```

**GET请求**：
```javascript
https://www.example.com,{
  "charset": "gbk",
  "headers": {"User-Agent": "Mozilla/5.0..."},
  "webView": true
}
```

**POST请求**：
```javascript
https://www.example.com,{
  "charset": "gbk",
  "method": "POST",
  "body": "searchkey={{key}}&page={{page}}",
  "headers": {"User-Agent": "Mozilla/5.0..."},
  "webView": true
}
```

**代理设置**：
```javascript
{"proxy": "socks5://127.0.0.1:1080"}
{"proxy": "http://127.0.0.1:1080"}
{"proxy": "socks5://127.0.0.1:1080@用户名@密码"}
```

### 变量的put与get

- `@put` 与 `@get`：只能用于js以外的规则
- `java.put` 与 `java.get`：只能用于js中

示例：
```
@put:{bid:"//*[@bid-data]/@bid-data"}
@get:{bid}
```

### {{}}与{}规则

- 搜索URL与发现URL中的 `{{}}` 里只能使用js
- 其他位置的 `{{}}` 可使用任意规则（正则除外），默认为js
  - Default规则需以 `@@` 开头
  - XPath需以 `@xpath:` 或 `//` 开头
  - JSONPath需以 `@json:` 或 `$.` 开头
  - CSS需以 `@css:` 开头
- `{}` 规则只能使用JSONPath，尽量避免使用

---

## 4、书源之「基本」

```json
{
  "bookSourceUrl": "https://www.example.com",
  "bookSourceName": "源名称",
  "bookSourceGroup": "分组名",
  "bookSourceType": 0,
  "bookSourceComment": "备注说明",
  "loginUrl": "登录地址（可选）",
  "header": "{\"User-Agent\":\"...\"}",
  "enabled": true,
  "enabledExplore": true,
  "customOrder": 0,
  "weight": 0
}
```

- `bookSourceType`: 0=文字, 1=音频, 2=图片, 3=文件（只提供下载）
- `bookUrlPattern`: 书籍详情页URL正则，用于匹配书籍
- `enabledCookieJar`: 是否启用自动Cookie管理
- `concurrentRate`: 并发率限制，如 `1000` 表示每秒1次
- `coverDecodeJs`: 封面图片解密JS（用于加密图片）

### 文字源 vs 图片源的区别

**文字源 (bookSourceType=0)**：
- 正文规则获取文本内容
- `ruleContent.content` 返回文字

**图片源 (bookSourceType=2)**：
- 正文规则获取图片URL列表
- `ruleContent.content` 返回图片URL，多个用换行分隔
- 可设置 `imageStyle`: `DEFAULT`(默认居中), `FULL`(最大宽度), `TEXT`(文字流式)
- 可设置 `imageDecode`: 图片解密JS，用于处理加密图片

---

## 5、书源之「搜索」

```json
{
  "searchUrl": "/search.php?q={{key}}&page={{page}}",
  "ruleSearch": {
    "bookList": "搜索结果列表选择器",
    "name": "书名选择器",
    "author": "作者选择器",
    "coverUrl": "封面图片选择器",
    "intro": "简介选择器",
    "kind": "分类选择器",
    "lastChapter": "最新章节选择器",
    "wordCount": "字数选择器",
    "bookUrl": "书籍详情页链接选择器"
  }
}
```

**searchUrl格式**：
- GET: `/search?key={{key}}&page={{page}}`
- POST: `/search,{"method":"POST","body":"searchkey={{key}}"}`
- 带编码: `/search?key={{key}},{"charset":"gbk"}`

---

## 6、书源之「发现」

```json
{
  "exploreUrl": "排行榜::https://www.example.com/rank\n最新::https://www.example.com/new",
  "ruleExplore": {
    "bookList": "列表选择器",
    "name": "书名",
    "author": "作者",
    "coverUrl": "封面",
    "intro": "简介",
    "bookUrl": "详情链接"
  }
}
```

发现URL格式：`分类名::URL` 多个用换行分隔

---

## 7、书源之「详情页」

```json
{
  "ruleBookInfo": {
    "init": "预处理规则（可选）",
    "name": "书名选择器",
    "author": "作者选择器",
    "coverUrl": "封面选择器",
    "intro": "简介选择器",
    "kind": "分类选择器",
    "lastChapter": "最新章节选择器",
    "wordCount": "字数选择器",
    "updateTime": "更新时间选择器",
    "tocUrl": "目录页URL选择器"
  }
}
```

常用详情页选择器：
```
name: //*[@property="og:novel:book_name"]/@content
author: //*[@property="og:novel:author"]/@content
coverUrl: //*[@property="og:image"]/@content
intro: //*[@property="og:description"]/@content
kind: //*[@property="og:novel:category"]/@content
```

---

## 8、书源之「目录」

```json
{
  "ruleToc": {
    "chapterList": "章节列表选择器",
    "chapterName": "章节名选择器",
    "chapterUrl": "章节链接选择器",
    "isVolume": "是否为卷标题",
    "updateTime": "更新时间",
    "nextTocUrl": "下一页目录URL"
  }
}
```

**目录列表常用写法（推荐 Default）**：
```
// Default（推荐）- 最简洁
chapterList: id.catalog@tag.li
chapterName: tag.a@text
chapterUrl: tag.a@href

// Default 变体
chapterList: class.chapter-list@tag.a
chapterName: text
chapterUrl: href

// CSS（仅在需要复杂选择器时使用）
chapterList: @css:#list dd a
chapterName: @text
chapterUrl: @href

// XPath
chapterList: //div[@id="list"]/dl/dd/a
chapterName: /text()
chapterUrl: /@href
```

---

## 9、书源之「正文」

```json
{
  "ruleContent": {
    "content": "正文内容选择器",
    "nextContentUrl": "下一页正文URL",
    "webJs": "webView时执行的js",
    "sourceRegex": "资源嗅探正则",
    "replaceRegex": "替换规则"
  }
}
```

**正文常用写法（推荐 Default）**：
```
// Default（推荐）- 最简洁
content: id.content@html
content: class.content@html
content: class.txtnav@html

// Default + 净化
content: class.content@html##<script[\s\S]*?</script>|广告文字

// XPath（复杂结构时使用）
content: //div[@id="content"]

// CSS（仅在需要复杂选择器时使用）
content: @css:#content@html
content: @css:.articleDiv p@textNodes##搜索.*手机访问|一秒记住.*
```

**资源嗅探（有声书）**：
```json
{
  "ruleContent": {
    "content": "<js>result</js>",
    "sourceRegex": ".*\\.(mp3|mp4|m4a).*"
  }
}
```
章节链接需加 `,{"webView":true}`

**图片源正文规则**：
```json
{
  "bookSourceType": 2,
  "ruleContent": {
    "content": "@css:.comic-page img@src",
    "imageStyle": "FULL",
    "imageDecode": "java.decodeBase64(result)"
  }
}
```
- 图片URL用换行分隔，每行一个图片
- `imageStyle`: `DEFAULT`(居中), `FULL`(全宽), `TEXT`(文字流)
- `imageDecode`: 图片解密JS，参数为图片bytes

---

## 10、补充说明

### 调试方法

- 调试搜索：输入关键字，如 `系统`
- 调试发现：输入发现URL，如 `月票榜::https://www.qidian.com/rank`
- 调试详情页：输入详情页URL，如 `https://m.qidian.com/book/1015609210`
- 调试目录页：输入 `++` 加目录页URL，如 `++https://www.example.com/book/123`
- 调试正文页：输入 `--` 加正文页URL，如 `--https://www.example.com/chapter/456`

### webView使用

无脑 `{"webView":true}` 很方便，适用于：
- 动态加载的页面
- 需要执行JavaScript的页面
- 反爬严格的网站

### 编码问题

- UTF-8（默认）：不需要指定charset
- GBK：`{"charset":"gbk"}`

### 常见问题

1. 获取不到内容：检查选择器是否正确，尝试使用webView
2. 乱码：添加正确的charset
3. 被反爬：添加User-Agent请求头
4. 动态内容：使用webView模式

### 懒加载图片处理

很多网站使用懒加载，真实图片URL在 `data-src`、`data-original`、`data-lazy` 等属性中：
```
// 优先获取 data-original，备选 src
coverUrl: img@data-original||img@src

// CSS写法
coverUrl: @css:img@data-src||@css:img@src

// 多属性尝试
coverUrl: img@data-original||img@data-src||img@data-lazy||img@src
```

### 属性获取技巧

Default规则最后一段可以是任意HTML属性名：
```
// 获取href属性
tag.a@href

// 获取src属性
tag.img@src

// 获取data-*属性
tag.div@data-id
tag.img@data-original

// 获取自定义属性
tag.div@bid-data
```

### 常用正则净化

```
// 移除script标签
##<script[\s\S]*?</script>##

// 移除style标签
##<style[\s\S]*?</style>##

// 移除广告文字
##广告|请收藏|手机访问|一秒记住.*

// 移除空白行
##\n\s*\n##\n

// 提取数字
##[^\d]##
```

---

## 11、AI 输出要求（重要）

### 模式一：生成完整书源（默认）

**触发条件**（需要输出完整 JSON）：
- 分析书源、生成书源、制作书源
<!-- - 分析网站、分析网页、解析网站 -->
<!-- - 生成规则、编写规则 -->
- 帮我做一个书源
- 这个网站怎么写书源
<!-- - 任何涉及小说网站、漫画网站、有声书网站的规则分析 -->

**输出格式要求**：必须输出完整的 Legado 书源 JSON 格式，包含以下所有字段：

```json
{
  "bookSourceUrl": "https://www.example.com",
  "bookSourceName": "源名称",
  "bookSourceGroup": "分组",
  "bookSourceType": 0,
  "bookSourceComment": "源说明",
  "enabled": true,
  "enabledExplore": true,
  "header": "",
  "loginUrl": "",
  "bookUrlPattern": "",
  "searchUrl": "搜索URL，必填",
  "exploreUrl": "",
  "ruleSearch": {
    "bookList": "必填",
    "name": "必填",
    "author": "",
    "coverUrl": "",
    "intro": "",
    "kind": "",
    "lastChapter": "",
    "wordCount": "",
    "bookUrl": "必填"
  },
  "ruleExplore": {
    "bookList": "",
    "name": "",
    "author": "",
    "coverUrl": "",
    "intro": "",
    "bookUrl": ""
  },
  "ruleBookInfo": {
    "init": "",
    "name": "",
    "author": "",
    "coverUrl": "",
    "intro": "",
    "kind": "",
    "lastChapter": "",
    "wordCount": "",
    "updateTime": "",
    "tocUrl": ""
  },
  "ruleToc": {
    "chapterList": "必填",
    "chapterName": "必填",
    "chapterUrl": "必填",
    "isVolume": "",
    "updateTime": "",
    "nextTocUrl": ""
  },
  "ruleContent": {
    "content": "必填",
    "nextContentUrl": "",
    "replaceRegex": "",
    "sourceRegex": "",
    "webJs": ""
  }
}
```

**输出规范**：
1. **必须是可直接导入的 JSON**：用户可以直接复制 JSON 导入到 Legado
2. **必须包含所有必填字段**：bookSourceUrl, bookSourceName, searchUrl, ruleSearch, ruleToc, ruleContent
3. **选择器必须基于实际分析**：不能凭空想象，必须根据提供的 HTML 结构
4. **添加注释说明**：在 bookSourceComment 中说明规则的编写思路
5. **优先使用 Default 语法**：不要滥用 `@css:` 前缀，Default 语法更简洁高效

**规则语法选择原则**：
- ✅ 优先使用 Default：`class.content@text`、`tag.a@href`、`id.list@tag.li`
- ✅ 获取属性直接写：`tag.img@src`、`tag.img@data-original`
- ⚠️ 仅在需要复杂选择器时使用 CSS：`:nth-child`、多类名组合、复杂层级
- ❌ 不要写：`@css:.content@text`（应该用 `class.content@text`）
- ❌ 不要写：`@css:#list@text`（应该用 `id.list@text`）

---

### 模式二：问题诊断与修复

**触发条件**（不需要完整 JSON，只需分析和修改建议）：
- 用户明确要求"分析原因"、"为什么不行"、"哪里有问题"、"什么原因"
- 用户询问"这个规则为什么获取不到"、"帮我看看哪里错了"
- 用户提供了具体字段并询问问题
- 调试、排错、修复相关请求

**输出格式要求**：
1. **问题分析**：根据提供的网页数据（如果有）分析实际情况
2. **原因说明**：解释为什么当前规则不工作
3. **修改建议**：给出具体的修改方案
4. **字段输出**：如果用户提供了具体字段，必须输出该字段修改后的完整值

**示例输出格式**：
```
## 问题分析
当前规则 `class.content@text` 无法获取内容，原因是...

## 修改建议
建议将规则改为：
- `ruleContent.content`: `@css:#content@html##<script[\s\S]*?</script>`

## 修改后的字段
"ruleContent": {
  "content": "@css:#content@html##<script[\\s\\S]*?</script>"
}
```

---

### 通用禁止行为

1. ❌ 不要虚构不存在的 CSS 类名或 ID
2. ❌ 不要说"你需要自己分析"，必须给出具体规则或建议
3. ❌ 模式一时不要只给出片段规则，必须给完整 JSON
4. ❌ 模式二时如果用户提供了字段，不要只说"改一下"，必须给出修改后的具体值
5. ❌ **不要滥用 `@css:` 前缀**：简单的类名/ID/标签选择应使用 Default 语法
   - 错误：`@css:.content@text` → 正确：`class.content@text`
   - 错误：`@css:#list@text` → 正确：`id.list@text`
   - 错误：`@css:a@href` → 正确：`tag.a@href`

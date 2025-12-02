/**
 * 武芊漫画书源全流程测试
 * 运行: npx ts-node test-wuqian-comic.ts
 */

import { SourceDebugger } from './src/main/debug/source-debugger';

const source = {
  bookSourceName: '武芊漫画',
  bookSourceType: 2,
  bookSourceUrl: 'https://comic.mkzcdn.com',
  searchUrl: 'https://comic.mkzcdn.com/search/keyword/?keyword={{key}}&page_num={{page}}&page_size=20',
  ruleSearch: {
    author: '$.author_title',
    bookList: '$..list[*]',
    bookUrl: 'https://comic.mkzcdn.com/comic/info/?comic_id={{$.comic_id}}',
    coverUrl: '$.cover',
    intro: '$.feature',
    lastChapter: '$.chapter_title',
    name: '$.title'
  },
  ruleBookInfo: {
    intro: '$..content##^##<br/>',
    kind: '$..theme_id\n@js:\nlet class_name="全部&修真&霸总&恋爱&校园&冒险&搞笑&生活&热血&架空&后宫&玄幻&悬疑&恐怖&灵异&动作&科幻&战争&古风&穿越&竞技&励志&同人&真人".split("&");\nlet class_url="0&2&1&3&4&5&6&7&8&9&10&12&13&14&15&16&17&18&19&20&21&23&24&26".split("&")\n\nlet res=Array.from(result)[0].split(",")\n\nfor(var i=0;i<class_url.length;i++){\n\tfor(var j=0;j<res.length;j++){\n\t\tif(class_url[i]==res[j]){\n\t\t\t  res[j]=class_name[i]\n\t\t\t}\n}\n}\n\n\nres.join(",")',
    name: '@put:{comic_id:$..comic_id}',
    tocUrl: 'https://comic.mkzcdn.com/chapter/v1/?comic_id={{$..comic_id}}'
  },
  ruleToc: {
    chapterList: '$.data',
    chapterName: '$.title',
    chapterUrl: 'https://comic.mkzcdn.com/chapter/content/?chapter_id={{$.chapter_id}}&comic_id=@get:{comic_id}'
  },
  ruleContent: {
    content: `$.data[*].image
@js:result.split("\\n").map(x=>'<img src="'+x+'">').join("\\n")`
  }
};

async function runTest() {
  console.log('========================================');
  console.log('武芊漫画书源全流程测试');
  console.log('========================================\n');

  const debugger_ = new SourceDebugger(source as any);

  // 1. 搜索测试
  console.log('【1. 搜索测试】关键词: 漫画');
  console.log('----------------------------------------');
  const searchResult = await debugger_.debugSearch('漫画');
  
  if (!searchResult.success) {
    console.error('搜索失败:', searchResult.error);
    return;
  }

  console.log('搜索日志:');
  searchResult.logs?.forEach(log => {
    console.log(`  [${log.category}] ${log.message}`);
  });

  const books = (searchResult.parsedItems || []) as any[];
  console.log(`\n搜索结果: ${books.length} 本漫画`);
  
  if (books.length === 0) {
    console.error('未搜索到漫画');
    return;
  }

  // 显示前3本
  books.slice(0, 3).forEach((book: any, i: number) => {
    console.log(`  [${i + 1}] ${book.name} - ${book.author || '未知作者'}`);
    console.log(`      最新: ${book.lastChapter}`);
    console.log(`      封面: ${book.coverUrl}`);
    console.log(`      URL: ${book.bookUrl}`);
  });

  // 2. 详情测试
  const firstBook = books[0] as any;
  const bookUrl = firstBook.bookUrl;
  
  console.log('\n【2. 详情测试】');
  console.log('----------------------------------------');
  console.log(`漫画URL: ${bookUrl}`);
  
  const detailResult = await debugger_.debugBookInfo(bookUrl);
  
  if (!detailResult.success) {
    console.error('详情获取失败:', detailResult.error);
  } else {
    console.log('详情日志:');
    detailResult.logs?.forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
    
    const detailArr = detailResult.parsedItems as any[];
    const detail = detailArr?.[0];
    if (detail) {
      console.log('\n漫画详情:');
      console.log(`  名称: ${detail.name}`);
      console.log(`  分类: ${detail.kind}`);
      console.log(`  简介: ${(detail.intro || '').substring(0, 100)}...`);
      console.log(`  目录URL: ${detail.tocUrl}`);
    }
  }

  // 3. 目录测试
  const detailArr2 = detailResult.parsedItems as any[];
  const tocUrl = detailArr2?.[0]?.tocUrl || bookUrl;
  console.log('\n【3. 目录测试】');
  console.log('----------------------------------------');
  console.log(`目录URL: ${tocUrl}`);
  
  const tocResult = await debugger_.debugToc(tocUrl);
  
  if (!tocResult.success) {
    console.error('目录获取失败:', tocResult.error);
  } else {
    console.log('目录日志:');
    tocResult.logs?.forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
    
    const chapters = (tocResult.parsedItems || []) as any[];
    console.log(`\n章节数: ${chapters.length}`);
    
    if (chapters.length > 0) {
      // 显示前3章
      console.log('前3章:');
      chapters.slice(0, 3).forEach((ch: any, i: number) => {
        console.log(`  [${i + 1}] ${ch.name} -> ${ch.url}`);
      });
      
      if (chapters.length > 3) {
        console.log(`  ...`);
        const lastCh = chapters[chapters.length - 1] as any;
        console.log(`  [${chapters.length}] ${lastCh.name} -> ${lastCh.url}`);
      }

      // 4. 正文测试（图片列表）
      const firstChapter = chapters[0] as any;
      const chapterUrl = firstChapter.url;
      
      console.log('\n【4. 正文测试（图片列表）】');
      console.log('----------------------------------------');
      console.log(`章节: ${firstChapter.name}`);
      console.log(`URL: ${chapterUrl}`);
      
      const contentResult = await debugger_.debugContent(chapterUrl);
      
      if (!contentResult.success) {
        console.error('正文获取失败:', contentResult.error);
      } else {
        console.log('正文日志:');
        contentResult.logs?.forEach(log => {
          console.log(`  [${log.category}] ${log.message}`);
        });
        
        const content = contentResult.parsedItems;
        if (content) {
          const text = typeof content === 'string' ? content : JSON.stringify(content);
          console.log(`\n正文内容预览: ${text.substring(0, 500)}`);
          // 提取图片URL - 支持单引号和双引号
          const imgMatches = text.match(/<img\s+src=["']([^"']+)["']/gi) || 
                            text.match(/http[s]?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi);
          console.log(`\n图片数量: ${imgMatches?.length || 0} 张`);
          if (imgMatches && imgMatches.length > 0) {
            console.log('前3张图片:');
            imgMatches.slice(0, 3).forEach((img, i) => {
              const url = img.match(/src=["']([^"']+)["']/i)?.[1] || img;
              console.log(`  [${i + 1}] ${url}`);
            });
          }
          console.log(`\n正文总长度: ${text.length} 字符`);
        }
      }
    }
  }

  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

runTest().catch(console.error);

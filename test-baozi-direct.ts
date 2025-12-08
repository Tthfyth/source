/**
 * 直接测试包子漫画请求
 */
import https from 'https';

async function test() {
  const url = 'https://cn.bzmanga.com/comic/hzw-one-piece';
  
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 30000,
    }, (res) => {
      console.log('状态码:', res.statusCode);
      console.log('响应头:', res.headers);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('响应长度:', data.length);
        console.log('响应预览:', data.substring(0, 500));
        resolve(null);
      });
    });
    
    req.on('error', (err) => {
      console.log('请求错误:', err.message);
      resolve(null);
    });
    
    req.on('timeout', () => {
      console.log('请求超时');
      req.destroy();
      resolve(null);
    });
  });
}

test();

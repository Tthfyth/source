/**
 * 测试 AES 解密
 */
import * as crypto from 'crypto';

const encryptedData = 'c/f4Fd66w+9jIZ3U1lba/j7dmWGDZVgsfdKDK2klm2e2fQn7NH0Zud5KZITBZq8kMLlY5YI2PyHs89bYfh7sLN8U/6eyRl5bE8LawDsu4byx+DQvBfv6e1WVNtKxWyH823aDNa4Ab2YahHjyrk/3UYgpYc/UYT+G1OMrogT+fnwd+biZ+iyWsoD+pif8YvGpFk/zkseAeFETYPjYp/7UAgc+RtXj1ujwYIhGIP7j5VaKKei+mY/UNtITQBxYyK3uzDMtdx2/bM/zXxw4+ArbRXO5DRHZm124QH1r5BwmDClPoiQHttvqKRrgBRLMF6rqbkQIHTJB7jlYON+EN6NWHVICeWOJG2upFaQiqMROpEFWViA8uvj9R55ZE3mzSezFXHOLvW9QvYWhvl6G8Rh+in80M+wdVThOIEc/cbgspCxRmGxExpzh6x5H/Z2wk5eYhj3o028m6qvI/Z6ptZEXDC6PiUeCgu/4w0o';

const key = '4548ded8c9e02690';
const iv = '1992360ee9bc4f8f';

try {
  const keyBuffer = Buffer.from(key, 'utf8');
  const ivBuffer = Buffer.from(iv, 'utf8');
  const inputBuffer = Buffer.from(encryptedData, 'base64');
  
  console.log('Key length:', keyBuffer.length);
  console.log('IV length:', ivBuffer.length);
  console.log('Input length:', inputBuffer.length);
  
  const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer);
  const decrypted = Buffer.concat([decipher.update(inputBuffer), decipher.final()]);
  
  console.log('\n解密成功！');
  console.log('解密后长度:', decrypted.length);
  console.log('解密后预览:', decrypted.toString('utf8').substring(0, 500));
} catch (e: any) {
  console.log('解密失败:', e.message);
}

import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * MD5 加密
 */
export function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

/**
 * 生成随机数字字符串
 */
export function generateRandomNumbers(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

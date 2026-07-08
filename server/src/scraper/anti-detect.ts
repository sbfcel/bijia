import { Page } from 'playwright'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
]

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function exponentialBackoff(retry: number, baseMs: number): Promise<void> {
  const ms = baseMs * Math.pow(2, retry) + Math.random() * 1000
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function stealthPage(page: Page): Promise<void> {
  await page.addInitScript(`
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });

    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: 'prompt' })
        : origQuery(parameters);
  `)

  await page.addInitScript(`
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return origGetParam.call(this, parameter);
    };
  `)
}

export async function simulateScroll(page: Page, maxScrolls = 3): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    const scrollDistance = 200 + Math.floor(Math.random() * 500)
    await page.evaluate(`window.scrollBy({ top: ${scrollDistance}, behavior: 'smooth' })`)
    await randomDelay(800, 2500)
  }
}

export async function humanLikeMove(page: Page): Promise<void> {
  const steps = 3 + Math.floor(Math.random() * 5)
  const startX = 100 + Math.floor(Math.random() * 300)
  const startY = 100 + Math.floor(Math.random() * 200)
  const endX = 400 + Math.floor(Math.random() * 400)
  const endY = 300 + Math.floor(Math.random() * 300)

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = startX + (endX - startX) * t + (Math.random() - 0.5) * 20
    const cy = startY + (endY - startY) * t + (Math.random() - 0.5) * 20
    await page.mouse.move(cx, cy)
    await randomDelay(30, 80)
  }
}

export function checkCaptchaBlock(html: string): boolean {
  const patterns = [
    /captcha/i,
    /验证码/i,
    /滑块验证/i,
    /安全验证/i,
    /人机验证/i,
    /请完成以下验证/i,
    /请输入验证码/i,
    /verify/i,
    /拼图验证/i,
    /请拖动滑块/i,
    /访问频繁/i,
    /请求过于频繁/i,
  ]
  return patterns.some((p) => p.test(html))
}

export interface AntiDetectConfig {
  delayMin: number
  delayMax: number
  maxRetries: number
  retryBaseDelay: number
  scrollPages: number
  respectRobotsTxt: boolean
}

export const DEFAULT_ANTI_DETECT: AntiDetectConfig = {
  delayMin: 2000,
  delayMax: 5000,
  maxRetries: 3,
  retryBaseDelay: 5000,
  scrollPages: 3,
  respectRobotsTxt: true,
}

export const PLATFORM_ANTI_DETECT: Record<string, AntiDetectConfig> = {
  pdd: {
    delayMin: 5000,
    delayMax: 8000,
    maxRetries: 2,
    retryBaseDelay: 10000,
    scrollPages: 4,
    respectRobotsTxt: true,
  },
  douyin: {
    delayMin: 5000,
    delayMax: 12000,
    maxRetries: 2,
    retryBaseDelay: 10000,
    scrollPages: 5,
    respectRobotsTxt: true,
  },
  tmall: {
    delayMin: 3000,
    delayMax: 6000,
    maxRetries: 3,
    retryBaseDelay: 6000,
    scrollPages: 3,
    respectRobotsTxt: true,
  },
}

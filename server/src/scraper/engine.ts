import { chromium, Browser, BrowserContext } from 'playwright'
import db from '../db/connection'
import { config } from '../config'
import { getParser } from './parsers'
import { buildSearchUrl, dedupByShop, normalizeShopName } from './parsers/utils'
import {
  randomUserAgent,
  randomDelay,
  exponentialBackoff,
  stealthPage,
  simulateScroll,
  humanLikeMove,
  checkCaptchaBlock,
  AntiDetectConfig,
  DEFAULT_ANTI_DETECT,
  PLATFORM_ANTI_DETECT,
} from './anti-detect'

let browser: Browser | null = null
const platformContexts = new Map<string, BrowserContext>()

function getAntiDetectConfig(platformCode: string): AntiDetectConfig {
  return PLATFORM_ANTI_DETECT[platformCode] || DEFAULT_ANTI_DETECT
}

async function getBrowser(platformCode: string): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
      ],
    })
  }
  return browser
}

export interface ScrapeResult {
  platformId: number
  platformCode: string
  productCount: number
  error?: string
  captchaDetected?: boolean
}

export async function scrapeKeyword(keywordId: number): Promise<ScrapeResult[]> {
  const keyword = await db('keywords').where({ id: keywordId }).first()
  if (!keyword) throw new Error('关键字不存在')

  const keywordPlatforms = await db('keyword_platforms')
    .join('platforms', 'keyword_platforms.platform_id', 'platforms.id')
    .where('keyword_platforms.keyword_id', keywordId)
    .where('platforms.enabled', 1)
    .select('platforms.id', 'platforms.code', 'platforms.name', 'platforms.search_url_template', 'platforms.parser_config')

  const results: ScrapeResult[] = []

  for (let i = 0; i < keywordPlatforms.length; i++) {
    const plat = keywordPlatforms[i]

    if (i > 0) {
      const antiCfg = getAntiDetectConfig(plat.code)
      await randomDelay(antiCfg.delayMin, antiCfg.delayMax)
    }

    const logId = await db('scrape_logs').insert({
      keyword_id: keywordId,
      platform_id: plat.id,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    const logIdNum = logId[0]

    try {
      const parser = getParser(plat.code)
      if (!parser) {
        throw new Error(`未找到平台解析器: ${plat.code}`)
      }

      const searchUrl = buildSearchUrl(plat.search_url_template || '', keyword.text)
      const antiCfg = getAntiDetectConfig(plat.code)

      const result = await scrapeWithRetry(
        plat.id,
        plat.code,
        searchUrl,
        keyword.text,
        keyword.price_limit,
        keyword.user_id,
        keywordId,
        antiCfg
      )

      await db('scrape_logs').where({ id: logIdNum }).update({
        status: result.captchaDetected ? 'blocked' : 'success',
        product_count: result.productCount,
        error_message: result.captchaDetected ? '检测到验证码/风控拦截' : (result.error || null),
        completed_at: new Date().toISOString(),
      })

      results.push({
        platformId: plat.id,
        platformCode: plat.code,
        productCount: result.productCount,
        error: result.error,
        captchaDetected: result.captchaDetected,
      })
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      await db('scrape_logs').where({ id: logIdNum }).update({
        status: 'failed',
        error_message: errMsg,
        completed_at: new Date().toISOString(),
      })

      results.push({
        platformId: plat.id,
        platformCode: plat.code,
        productCount: 0,
        error: errMsg,
      })
    }
  }

  return results
}

async function scrapeWithRetry(
  platformId: number,
  platformCode: string,
  url: string,
  keywordText: string,
  priceLimit: number,
  userId: number,
  keywordId: number,
  antiCfg: AntiDetectConfig
): Promise<{ productCount: number; error?: string; captchaDetected?: boolean }> {
  let lastError: string | undefined

  for (let attempt = 0; attempt <= antiCfg.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Scraper] Retry ${attempt}/${antiCfg.maxRetries} for ${platformCode}`)
        await exponentialBackoff(attempt - 1, antiCfg.retryBaseDelay)
        await closePlatformContext(platformCode)
      }

      const parser = getParser(platformCode)
      if (!parser) {
        throw new Error(`未找到平台解析器: ${platformCode}`)
      }

      const browserInstance = await getBrowser(platformCode)
      const context = await createStealthContext(browserInstance, platformCode)
      const page = await context.newPage()

      await stealthPage(page)

      const account = await db('platform_accounts')
        .where({ user_id: userId, platform_id: platformId, status: 'active' })
        .first()

      if (account && account.cookies) {
        try {
          const cookies = JSON.parse(account.cookies)
          const cookieEntries = Array.isArray(cookies)
            ? cookies
            : Object.entries(cookies).map(([name, value]) => ({
                name,
                value: String(value),
                domain: new URL(url).hostname,
                path: '/',
              }))
          await context.addCookies(cookieEntries)
        } catch {
          // cookie 解析失败则跳过
        }
      }

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.scrapeTimeout,
      })

      await randomDelay(2000, 4000)

      await humanLikeMove(page)
      await simulateScroll(page, antiCfg.scrollPages)

      const html = await page.content()

      if (checkCaptchaBlock(html)) {
        console.warn(`[Scraper] Captcha/block detected on ${platformCode}`)
        await page.close()
        return { productCount: 0, captchaDetected: true, error: '检测到验证码或风控拦截' }
      }

      await page.close()

      const baseUrl = new URL(url).origin
      const rawProducts = parser.parse(html, keywordText, baseUrl)
      const deduped = dedupByShop(rawProducts)

      let count = 0
      for (const product of deduped) {
        const belowLimit = product.price < priceLimit ? 1 : 0

        const existing = await db('products')
          .where({
            keyword_id: keywordId,
            platform_id: platformId,
            shop_name: normalizeShopName(product.shopName),
          })
          .first()

        if (existing) {
          if (product.price < existing.price) {
            await db('products').where({ id: existing.id }).update({
              product_name: product.productName,
              price: product.price,
              shop_url: product.shopUrl,
              product_url: product.productUrl,
              image_url: product.imageUrl || null,
              scraped_at: new Date().toISOString(),
              below_limit: belowLimit,
            })
            count++
          }
        } else {
          await db('products').insert({
            keyword_id: keywordId,
            platform_id: platformId,
            shop_name: normalizeShopName(product.shopName),
            product_name: product.productName,
            price: product.price,
            shop_url: product.shopUrl,
            product_url: product.productUrl,
            image_url: product.imageUrl || null,
            scraped_at: new Date().toISOString(),
            below_limit: belowLimit,
          })
          count++
        }
      }

      return { productCount: count }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Scraper] Error on ${platformCode} (attempt ${attempt + 1}):`, lastError)
    }
  }

  return { productCount: 0, error: lastError }
}

async function createStealthContext(browser: Browser, platformCode: string): Promise<BrowserContext> {
  await closePlatformContext(platformCode)

  const context = await browser.newContext({
    userAgent: randomUserAgent(),
    viewport: { width: 1366 + Math.floor(Math.random() * 200), height: 768 + Math.floor(Math.random() * 200) },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    geolocation: { latitude: 39.9042 + Math.random() * 0.1, longitude: 116.4074 + Math.random() * 0.1 },
    permissions: ['geolocation'],
  })

  platformContexts.set(platformCode, context)
  return context
}

async function closePlatformContext(platformCode: string): Promise<void> {
  const existing = platformContexts.get(platformCode)
  if (existing) {
    try {
      await existing.close()
    } catch {
      // ignore
    }
    platformContexts.delete(platformCode)
  }
}

export async function closeBrowser() {
  for (const [, context] of platformContexts) {
    try {
      await context.close()
    } catch {
      // ignore
    }
  }
  platformContexts.clear()

  if (browser) {
    await browser.close()
    browser = null
  }
}

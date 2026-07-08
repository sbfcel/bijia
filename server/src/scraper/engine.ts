import { chromium, Browser } from 'playwright'
import db from '../db/connection'
import { config } from '../config'
import { getParser } from './parsers'
import { buildSearchUrl, dedupByShop, normalizeShopName } from './parsers/utils'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true })
  }
  return browser
}

export interface ScrapeResult {
  platformId: number
  platformCode: string
  productCount: number
  error?: string
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

  for (const plat of keywordPlatforms) {
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
      const browserInstance = await getBrowser()
      const page = await browserInstance.newPage()

      const account = await db('platform_accounts')
        .where({ user_id: keyword.user_id, platform_id: plat.id, status: 'active' })
        .first()

      if (account && account.cookies) {
        try {
          const cookies = JSON.parse(account.cookies)
          const cookieEntries: { name: string; value: string; domain: string; path: string }[] =
            Array.isArray(cookies) ? cookies : Object.entries(cookies).map(([name, value]) => ({ name, value: String(value), domain: new URL(searchUrl).hostname, path: '/' }))
          await page.context().addCookies(cookieEntries)
        } catch {
          // cookie 解析失败则跳过
        }
      }

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: config.scrapeTimeout,
      })

      await page.waitForTimeout(3000)
      const html = await page.content()
      await page.close()

      const baseUrl = new URL(searchUrl).origin
      const rawProducts = parser.parse(html, keyword.text, baseUrl)
      const deduped = dedupByShop(rawProducts)

      let count = 0
      for (const product of deduped) {
        const belowLimit = product.price < keyword.price_limit ? 1 : 0

        const existing = await db('products')
          .where({
            keyword_id: keywordId,
            platform_id: plat.id,
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
            platform_id: plat.id,
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

      await db('scrape_logs').where({ id: logIdNum }).update({
        status: 'success',
        product_count: count,
        completed_at: new Date().toISOString(),
      })

      results.push({
        platformId: plat.id,
        platformCode: plat.code,
        productCount: count,
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

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}

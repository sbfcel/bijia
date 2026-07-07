import { PlatformParser, ParsedProduct } from './types'
import { parsePrice } from './utils'

export const douyinParser: PlatformParser = {
  name: '抖音',

  parse(html: string, _keyword: string, _baseUrl: string): ParsedProduct[] {
    const products: ParsedProduct[] = []

    const itemPattern = /<div[^>]*class="[^"]*(?:product|card|item)[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi
    let match
    let count = 0

    while ((match = itemPattern.exec(html)) !== null && count < 60) {
      const block = match[0]

      const titleMatch = block.match(/>([^<]{5,80})<\/div>/)
      const priceMatch = block.match(/¥\s*(\d+\.?\d*)/)
        || block.match(/(\d+\.?\d*)\s*元/)
      const shopMatch = block.match(/class="[^"]*(?:shop|store|name|seller)[^"]*"[^>]*>([^<]*)</)
      const linkMatch = block.match(/href="([^"]*(?:product|detail|item|goods)[^"]*)"/)

      if (!titleMatch) continue
      const title = titleMatch[1].trim()
      if (title.length < 3) continue

      count++
      products.push({
        productName: title,
        price: priceMatch ? parsePrice(priceMatch[0]) : 0,
        shopName: shopMatch ? shopMatch[1].trim() : '抖音店铺',
        shopUrl: '',
        productUrl: linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : 'https://haohuo.jinritemai.com' + linkMatch[1]) : '',
      })
    }

    return products
  },
}

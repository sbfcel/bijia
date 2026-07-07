import { PlatformParser, ParsedProduct } from './types'
import { parsePrice } from './utils'

export const pddParser: PlatformParser = {
  name: '拼多多',

  parse(html: string, _keyword: string, _baseUrl: string): ParsedProduct[] {
    const products: ParsedProduct[] = []

    const itemPattern = /<div[^>]*class="[^"]*goods-item[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi
    let match
    let searchStr = html

    while ((match = itemPattern.exec(searchStr)) !== null) {
      const block = match[0]

      const titleMatch = block.match(/class="[^"]*goods-name[^"]*"[^>]*>([^<]*)</)
        || block.match(/class="[^"]*title[^"]*"[^>]*>([^<]*)</)
        || block.match(/>([^<]{5,80})<\/div>/)
      const priceMatch = block.match(/(\d+\.?\d*)\s*元/)
        || block.match(/¥\s*(\d+\.?\d*)/)
        || block.match(/(\d+\.?\d*)/)
      const shopMatch = block.match(/class="[^"]*mall-name[^"]*"[^>]*>([^<]*)</)
        || block.match(/class="[^"]*shop[^"]*"[^>]*>([^<]*)</)
      const linkMatch = block.match(/href="([^"]*goods[^"]*\.html[^"]*)"/)
        || block.match(/href="([^"]*search_result[^"]*)"/)

      const title = titleMatch ? titleMatch[1].trim() : ''
      if (!title || title.length < 2) continue

      let price = 0
      if (priceMatch) {
        price = parsePrice(priceMatch[0])
      }

      products.push({
        productName: title,
        price,
        shopName: shopMatch ? shopMatch[1].trim() : '拼多多店铺',
        shopUrl: '',
        productUrl: linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : 'https://mobile.yangkeduo.com' + linkMatch[1]) : '',
      })
    }

    if (products.length === 0) {
      const fallbackPattern = /<a[^>]*href="([^"]*goods[^"]*\.html[^"]*)"[^>]*>[\s\S]*?<\/a>/gi
      let blockIdx = 0
      while ((match = fallbackPattern.exec(html)) !== null && blockIdx < 60) {
        blockIdx++
        const productUrl = match[1].startsWith('http') ? match[1] : 'https://mobile.yangkeduo.com' + match[1]

        const surrounding = html.substring(Math.max(0, match.index - 200), Math.min(html.length, match.index + 500))

        const nameMatch = surrounding.match(/>([^<]{3,60})<\/div>/g)
        const priceMatch = surrounding.match(/(\d+\.?\d*)/g)

        const title = nameMatch && nameMatch.length > 0
          ? nameMatch[nameMatch.length - 1].replace(/[<>\/]/g, '').replace(/div/g, '').trim()
          : ''

        const price = priceMatch && priceMatch.length > 0
          ? parseFloat(priceMatch[0])
          : 0

        if (title && price > 0) {
          products.push({
            productName: title,
            price,
            shopName: '拼多多店铺',
            shopUrl: '',
            productUrl,
          })
        }
      }
    }

    return products
  },
}

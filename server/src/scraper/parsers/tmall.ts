import { PlatformParser, ParsedProduct } from './types'
import { parsePrice } from './utils'

export const tmallParser: PlatformParser = {
  name: '天猫',

  parse(html: string, _keyword: string, _baseUrl: string): ParsedProduct[] {
    const products: ParsedProduct[] = []

    const itemPattern = /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi
    let match
    let count = 0

    const patterns = [
      /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
      /<div[^>]*data-id="[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
      /<a[^>]*href="[^"]*detail\.tmall\.com[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    ]

    for (const pattern of patterns) {
      if (products.length > 0) break
      let match
      while ((match = pattern.exec(html)) !== null && count < 60) {
        const block = match[0]

        const titleMatch = block.match(/>([^<]{5,80})<\/a>/)
          || block.match(/>([^<]{5,80})<\/div>/)
        const priceMatch = block.match(/(\d+\.?\d*)/g)

        if (!titleMatch) continue
        const title = titleMatch[1].trim()
        if (title.length < 3) continue

        count++

        let price = 0
        if (priceMatch) {
          for (const p of priceMatch) {
            const v = parseFloat(p)
            if (v > 1 && v < 999999 && String(v) === p) {
              price = v
              break
            }
          }
        }

        const linkMatch = block.match(/href="([^"]*detail\.tmall\.com[^"]*)"/)
          || block.match(/href="([^"]*tmall\.com[^"]*)"/)

        const shopMatch = block.match(/class="[^"]*shop[^"]*"[^>]*>[\s\S]*?>([^<]+)</)
          || block.match(/<span[^>]*>([^<]{2,30})<\/span>/)

        products.push({
          productName: title,
          price,
          shopName: shopMatch ? shopMatch[1].trim() : '天猫店铺',
          shopUrl: '',
          productUrl: linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : 'https:' + linkMatch[1]) : '',
        })
      }
    }

    return products
  },
}

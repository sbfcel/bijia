import { PlatformParser, ParsedProduct } from './types'
import { parsePrice } from './utils'

export const jdParser: PlatformParser = {
  name: '京东',

  parse(html: string, _keyword: string, _baseUrl: string): ParsedProduct[] {
    const products: ParsedProduct[] = []

    const pattern = /data-sku="(\d+)"[^>]*>[\s\S]*?<\/li>/g
    let match

    while ((match = pattern.exec(html)) !== null) {
      const block = match[0]

      const titleMatch = block.match(/<em>([^<]*)<\/em>/)
      const priceMatch = block.match(/<i>([^<]*)<\/i>/)
      const shopMatch = block.match(/<span[^>]*class="[^"]*J_im_icon[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>/)
      const linkMatch = block.match(/<a[^>]*href="(\/\/item\.jd\.com\/\d+\.html)"[^>]*>/)

      if (!titleMatch || !priceMatch) continue

      const title = titleMatch[1].replace(/<[^>]+>/g, '').trim()
      let price = 0
      const priceText = priceMatch[1]
      if (priceText) {
        price = parsePrice(priceText)
      }

      products.push({
        productName: title,
        price,
        shopName: shopMatch ? shopMatch[1].trim() : '京东自营',
        shopUrl: '',
        productUrl: linkMatch ? 'https:' + linkMatch[1] : '',
      })
    }

    if (products.length === 0) {
      const fallbackPattern = /<div[^>]*class="[^"]*gl-i-wrap[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g
      while ((match = fallbackPattern.exec(html)) !== null) {
        const block = match[0]
        const titleMatch = block.match(/<em>([^<]+)/)
        const priceMatch = block.match(/<i>([\d.]+)<\/i>/)
        const shopMatch = block.match(/<span[^>]*>([^<]{2,20})<\/span>/)
        const linkMatch = block.match(/href="(\/\/item\.jd\.com\/\d+\.html)"/)

        if (!titleMatch || !priceMatch) continue

        products.push({
          productName: titleMatch[1].trim(),
          price: parseFloat(priceMatch[1]),
          shopName: shopMatch ? shopMatch[1].trim() : '京东店铺',
          shopUrl: '',
          productUrl: linkMatch ? 'https:' + linkMatch[1] : '',
        })
      }
    }

    return products
  },
}

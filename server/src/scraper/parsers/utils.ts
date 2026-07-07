import { ParsedProduct } from './types'

export function parsePrice(text: string): number {
  const cleaned = text.replace(/[^\d.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function buildSearchUrl(template: string, keyword: string): string {
  return template.replace('{keyword}', encodeURIComponent(keyword))
}

export function normalizeShopName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

export function dedupByShop(products: ParsedProduct[]): ParsedProduct[] {
  const map = new Map<string, ParsedProduct>()
  for (const p of products) {
    const key = normalizeShopName(p.shopName)
    const existing = map.get(key)
    if (!existing || p.price < existing.price) {
      map.set(key, p)
    }
  }
  return Array.from(map.values())
}

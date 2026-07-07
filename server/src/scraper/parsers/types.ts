export interface ParsedProduct {
  shopName: string
  productName: string
  price: number
  shopUrl: string
  productUrl: string
  imageUrl?: string
}

export interface PlatformParser {
  name: string
  parse(html: string, keyword: string, baseUrl: string): ParsedProduct[]
}

export interface ParserConfig {
  productSelector: string
  titleSelector: string
  priceSelector: string
  shopSelector: string
  linkSelector: string
}

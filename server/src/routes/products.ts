import { Router, Response } from 'express'
import db from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { scrapeKeyword } from '../scraper/engine'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword_id, platform_id, min_price, max_price, page = '1', limit = '20', sort = 'price_asc' } = req.query

    let query = db('products')
      .join('keywords', 'products.keyword_id', 'keywords.id')
      .join('platforms', 'products.platform_id', 'platforms.id')
      .where('keywords.user_id', req.userId)
      .where('products.below_limit', 1)

    if (keyword_id) query = query.where('products.keyword_id', keyword_id)
    if (platform_id) query = query.where('products.platform_id', platform_id)
    if (min_price) query = query.where('products.price', '>=', parseFloat(min_price as string))
    if (max_price) query = query.where('products.price', '<=', parseFloat(max_price as string))

    const countQuery = query.clone()

    if (sort === 'price_asc') {
      query = query.orderBy('products.price', 'asc')
    } else if (sort === 'price_desc') {
      query = query.orderBy('products.price', 'desc')
    } else {
      query = query.orderBy('products.scraped_at', 'desc')
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)
    query = query.offset(offset).limit(parseInt(limit as string))

    const products = await query.select(
      'products.*',
      'keywords.text as keyword_text',
      'keywords.price_limit',
      'platforms.code as platform_code',
      'platforms.name as platform_name'
    )

    const countResult = await countQuery.count('products.id as total').first()
    const total = countResult ? Number(countResult.total) : 0

    res.json({
      data: products,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error) {
    res.status(500).json({ error: '获取商品列表失败' })
  }
})

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await db('products')
      .join('keywords', 'products.keyword_id', 'keywords.id')
      .join('platforms', 'products.platform_id', 'platforms.id')
      .where('keywords.user_id', req.userId)
      .where('products.below_limit', 1)
      .select('platforms.code', 'platforms.name')
      .count('products.id as count')
      .groupBy('platforms.code')

    const totalResult = await db('products')
      .join('keywords', 'products.keyword_id', 'keywords.id')
      .where('keywords.user_id', req.userId)
      .where('products.below_limit', 1)
      .count('products.id as total')
      .first()

    const total = totalResult ? Number(totalResult.total) : 0

    res.json({ total, byPlatform: stats })
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' })
  }
})

router.post('/scrape/:keywordId', async (req: AuthRequest, res: Response) => {
  try {
    const { keywordId } = req.params

    const keyword = await db('keywords')
      .where({ id: keywordId, user_id: req.userId })
      .first()

    if (!keyword) {
      res.status(404).json({ error: '关键字不存在' })
      return
    }

    const results = await scrapeKeyword(parseInt(keywordId))
    res.json({ message: '采集完成', results })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '采集失败'
    res.status(500).json({ error: errMsg })
  }
})

export default router

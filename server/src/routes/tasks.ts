import { Router, Response } from 'express'
import db from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword_id, page = '1', limit = '20' } = req.query

    let query = db('scrape_logs')
      .join('keywords', 'scrape_logs.keyword_id', 'keywords.id')
      .join('platforms', 'scrape_logs.platform_id', 'platforms.id')
      .where('keywords.user_id', req.userId)

    if (keyword_id) query = query.where('scrape_logs.keyword_id', keyword_id)

    const countQuery = query.clone()

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    const logs = await query
      .select(
        'scrape_logs.*',
        'platforms.code as platform_code',
        'platforms.name as platform_name',
        'keywords.text as keyword_text'
      )
      .orderBy('scrape_logs.started_at', 'desc')
      .offset(offset)
      .limit(parseInt(limit as string))

    const countResult = await countQuery.count('scrape_logs.id as total').first()
    const total = countResult ? Number(countResult.total) : 0

    res.json({
      data: logs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error) {
    res.status(500).json({ error: '获取任务日志失败' })
  }
})

export default router

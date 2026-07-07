import { Router, Response } from 'express'
import db from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const keywords = await db('keywords')
      .where({ user_id: req.userId })
      .select('*')
      .orderBy('created_at', 'desc')

    for (const kw of keywords) {
      const platforms = await db('keyword_platforms')
        .join('platforms', 'keyword_platforms.platform_id', 'platforms.id')
        .where('keyword_platforms.keyword_id', kw.id)
        .select('platforms.id', 'platforms.code', 'platforms.name')
      kw.platforms = platforms
    }

    res.json(keywords)
  } catch (error) {
    res.status(500).json({ error: '获取关键字列表失败' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { text, price_limit, interval_minutes, platform_ids } = req.body
    if (!text || !price_limit) {
      res.status(400).json({ error: '关键字和限价不能为空' })
      return
    }
    if (price_limit <= 0) {
      res.status(400).json({ error: '限价必须大于0' })
      return
    }

    const [keywordId] = await db('keywords').insert({
      user_id: req.userId,
      text,
      price_limit,
      interval_minutes: interval_minutes || 30,
    })

    if (platform_ids && platform_ids.length > 0) {
      const rows = platform_ids.map((pid: number) => ({
        keyword_id: keywordId,
        platform_id: pid,
      }))
      await db('keyword_platforms').insert(rows)
    }

    const keyword = await db('keywords').where({ id: keywordId }).first()
    res.status(201).json(keyword)
  } catch (error) {
    res.status(500).json({ error: '创建关键字失败' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const kw = await db('keywords').where({ id, user_id: req.userId }).first()
    if (!kw) {
      res.status(404).json({ error: '关键字不存在' })
      return
    }

    const { text, price_limit, interval_minutes, enabled, platform_ids } = req.body
    const update: Record<string, unknown> = { updated_at: db.fn.now() }

    if (text !== undefined) update.text = text
    if (price_limit !== undefined) {
      if (price_limit <= 0) {
        res.status(400).json({ error: '限价必须大于0' })
        return
      }
      update.price_limit = price_limit
    }
    if (interval_minutes !== undefined) update.interval_minutes = interval_minutes
    if (enabled !== undefined) update.enabled = enabled ? 1 : 0

    await db('keywords').where({ id }).update(update)

    if (platform_ids !== undefined) {
      await db('keyword_platforms').where({ keyword_id: id }).del()
      if (platform_ids.length > 0) {
        const rows = platform_ids.map((pid: number) => ({
          keyword_id: parseInt(id),
          platform_id: pid,
        }))
        await db('keyword_platforms').insert(rows)
      }
    }

    const updated = await db('keywords').where({ id }).first()
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: '更新关键字失败' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const kw = await db('keywords').where({ id, user_id: req.userId }).first()
    if (!kw) {
      res.status(404).json({ error: '关键字不存在' })
      return
    }

    await db('keywords').where({ id }).del()
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ error: '删除关键字失败' })
  }
})

export default router

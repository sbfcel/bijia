import { Router, Response } from 'express'
import db from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const platforms = await db('platforms').select('*').orderBy('id')
    res.json(platforms)
  } catch (error) {
    res.status(500).json({ error: '获取平台列表失败' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { enabled, parser_config, search_url_template } = req.body

    const update: Record<string, unknown> = {}
    if (enabled !== undefined) update.enabled = enabled ? 1 : 0
    if (parser_config !== undefined) update.parser_config = typeof parser_config === 'string' ? parser_config : JSON.stringify(parser_config)
    if (search_url_template !== undefined) update.search_url_template = search_url_template

    await db('platforms').where({ id }).update(update)
    const platform = await db('platforms').where({ id }).first()
    res.json(platform)
  } catch (error) {
    res.status(500).json({ error: '更新平台配置失败' })
  }
})

export default router

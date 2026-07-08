import { Router, Response } from 'express'
import db from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await db('platform_accounts')
      .join('platforms', 'platform_accounts.platform_id', 'platforms.id')
      .where('platform_accounts.user_id', req.userId)
      .select(
        'platform_accounts.*',
        'platforms.code as platform_code',
        'platforms.name as platform_name'
      )
      .orderBy('platforms.id')
    res.json(accounts)
  } catch (error) {
    res.status(500).json({ error: '获取账号列表失败' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { platform_id, account_name, cookies } = req.body
    if (!platform_id || !account_name) {
      res.status(400).json({ error: '平台和账号名称不能为空' })
      return
    }

    const existing = await db('platform_accounts')
      .where({ user_id: req.userId, platform_id })
      .first()
    if (existing) {
      res.status(400).json({ error: '该平台已存在账号，请使用编辑功能' })
      return
    }

    const [id] = await db('platform_accounts').insert({
      user_id: req.userId,
      platform_id,
      account_name,
      cookies: cookies || null,
    })

    const account = await db('platform_accounts').where({ id }).first()
    res.status(201).json(account)
  } catch (error) {
    res.status(500).json({ error: '添加账号失败' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const account = await db('platform_accounts').where({ id, user_id: req.userId }).first()
    if (!account) {
      res.status(404).json({ error: '账号不存在' })
      return
    }

    const { account_name, cookies, status } = req.body
    const update: Record<string, unknown> = { updated_at: db.fn.now() }

    if (account_name !== undefined) update.account_name = account_name
    if (cookies !== undefined) update.cookies = cookies
    if (status !== undefined) update.status = status

    await db('platform_accounts').where({ id }).update(update)

    const updated = await db('platform_accounts').where({ id }).first()
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: '更新账号失败' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const account = await db('platform_accounts').where({ id, user_id: req.userId }).first()
    if (!account) {
      res.status(404).json({ error: '账号不存在' })
      return
    }

    await db('platform_accounts').where({ id }).del()
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ error: '删除账号失败' })
  }
})

export default router

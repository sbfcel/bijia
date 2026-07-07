import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { config } from '../config'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ error: '密码长度不能少于6位' })
      return
    }

    const existing = await db('users').where({ username }).first()
    if (existing) {
      res.status(400).json({ error: '用户名已存在' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const [id] = await db('users').insert({ username, password_hash: passwordHash })
    res.status(201).json({ id, username })
  } catch (error) {
    res.status(500).json({ error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' })
      return
    }

    const user = await db('users').where({ username }).first()
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' })
      return
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    })

    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (error) {
    res.status(500).json({ error: '登录失败' })
  }
})

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db('users').where({ id: req.userId }).select('id', 'username', 'created_at').first()
    if (!user) {
      res.status(404).json({ error: '用户不存在' })
      return
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

export default router

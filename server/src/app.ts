import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import platformRoutes from './routes/platforms'
import keywordRoutes from './routes/keywords'
import productRoutes from './routes/products'
import exportRoutes from './routes/export'
import taskRoutes from './routes/tasks'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/platforms', platformRoutes)
app.use('/api/keywords', keywordRoutes)
app.use('/api/products', productRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/tasks', taskRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

export default app

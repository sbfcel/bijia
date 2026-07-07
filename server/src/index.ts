import app from './app'
import { config } from './config'
import { setupDatabase } from './db/connection'
import { startScheduler } from './scraper/scheduler'

async function main() {
  await setupDatabase()

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`)
  })

  await startScheduler()
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

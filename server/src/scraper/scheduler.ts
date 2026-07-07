import cron from 'node-cron'
import db from '../db/connection'
import { scrapeKeyword } from './engine'

const jobs = new Map<number, cron.ScheduledTask>()

export async function startScheduler() {
  const keywords = await db('keywords')
    .join('keyword_platforms', 'keywords.id', 'keyword_platforms.keyword_id')
    .where('keywords.enabled', 1)
    .select('keywords.id', 'keywords.interval_minutes')
    .distinct()

  for (const kw of keywords) {
    scheduleKeyword(kw.id, kw.interval_minutes || 30)
  }

  console.log(`Scheduler started with ${jobs.size} keyword jobs`)
}

function scheduleKeyword(keywordId: number, intervalMinutes: number) {
  stopKeyword(keywordId)

  const cronExpression = `*/${intervalMinutes} * * * *`

  const job = cron.schedule(cronExpression, async () => {
    try {
      console.log(`[Scheduler] Running scrape for keyword ${keywordId}`)
      await scrapeKeyword(keywordId)
    } catch (error) {
      console.error(`[Scheduler] Error scraping keyword ${keywordId}:`, error)
    }
  })

  jobs.set(keywordId, job)
}

export function stopKeyword(keywordId: number) {
  const existing = jobs.get(keywordId)
  if (existing) {
    existing.stop()
    jobs.delete(keywordId)
  }
}

export function rescheduleKeyword(keywordId: number, intervalMinutes: number) {
  stopKeyword(keywordId)
  scheduleKeyword(keywordId, intervalMinutes)
}

export function stopAllJobs() {
  for (const [id, job] of jobs) {
    job.stop()
  }
  jobs.clear()
}

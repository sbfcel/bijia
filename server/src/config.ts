export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'bijia-jwt-secret-key-2026',
  jwtExpiresIn: '24h' as const,
  scrapeTimeout: 30000,
  maxScrapeRetries: 2,
}

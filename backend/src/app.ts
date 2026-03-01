import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import authRoutes from './api/routes/auth.routes'
import campaignRoutes from './api/routes/campaigns.routes'
import leadsRoutes from './api/routes/leads.routes'
import scrapingRoutes from './api/routes/scraping.routes'
import draftsRoutes from './api/routes/drafts.routes'
import analyticsRoutes from './api/routes/analytics.routes'
import webhooksRoutes from './api/routes/webhooks.routes'
import trackingRoutes from './api/routes/tracking.routes'

const app = express()

app.use(helmet())
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3001',
]
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/auth', authRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/leads', leadsRoutes)
app.use('/api/scraping', scrapingRoutes)
app.use('/api/drafts', draftsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/webhooks', webhooksRoutes)
app.use('/track', trackingRoutes)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined })
})

export default app

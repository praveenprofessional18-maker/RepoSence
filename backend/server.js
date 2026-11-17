import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 90, standardHeaders: 'draft-7', legacyHeaders: false }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'RepoSense API', timestamp: new Date().toISOString() })
})

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

async function start() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected')
  } else {
    console.warn('MONGODB_URI is not configured; starting without database')
  }
  app.listen(PORT, () => console.log(`RepoSense API listening on http://localhost:${PORT}`))
}

start().catch(error => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})

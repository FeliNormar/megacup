/**
 * MEGA CUP - Backend API
 * Persistencia en db.json (JSON flat-file).
 * Para producción: migrar a PostgreSQL con el esquema al final de este archivo.
 */
import express from 'express'
import cors    from 'cors'
import fs      from 'fs'
import path    from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH   = path.join(__dirname, 'db.json')

// ── DB helpers ───────────────────────────────────────────────────────────────
function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }
  catch { return { assignments: [], records: [] } }
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// ── Express ──────────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

// GET /api/records - historial completo
app.get('/api/records', (req, res) => {
  const db = readDB()
  res.json(db.records)
})

// POST /api/records - guardar registro finalizado
app.post('/api/records', (req, res) => {
  const db = readDB()
  const record = { ...req.body, savedAt: Date.now() }
  db.records.unshift(record)
  writeDB(db)
  res.json({ ok: true, id: record.id })
})

// GET /api/assignments - asignaciones activas
app.get('/api/assignments', (req, res) => {
  const db = readDB()
  res.json(db.assignments)
})

// POST /api/assignments - crear/actualizar asignación activa
app.post('/api/assignments', (req, res) => {
  const db = readDB()
  const idx = db.assignments.findIndex((a) => a.id === req.body.id)
  if (idx >= 0) db.assignments[idx] = req.body
  else db.assignments.push(req.body)
  writeDB(db)
  res.json({ ok: true })
})

// DELETE /api/assignments/:id
app.delete('/api/assignments/:id', (req, res) => {
  const db = readDB()
  db.assignments = db.assignments.filter((a) => a.id !== req.params.id)
  writeDB(db)
  res.json({ ok: true })
})

// GET /api/analytics?month=YYYY-MM
app.get('/api/analytics', (req, res) => {
  const db = readDB()
  const { month } = req.query
  let records = db.records.filter((r) => r.endTime && r.startTime)
  if (month) {
    records = records.filter((r) => {
      const d = new Date(r.startTime)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month
    })
  }
  res.json(records)
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`API → http://localhost:${PORT}`))

/*
 * ── Esquema PostgreSQL (para migración futura) ───────────────────────────────
 *
 * CREATE TABLE workers (
 *   id   SERIAL PRIMARY KEY,
 *   name VARCHAR(100) NOT NULL UNIQUE
 * );
 *
 * CREATE TABLE assignments (
 *   id         VARCHAR(50) PRIMARY KEY,
 *   nave       VARCHAR(20) NOT NULL,
 *   provider   VARCHAR(100),
 *   po         VARCHAR(100),
 *   start_time BIGINT,
 *   end_time   BIGINT,
 *   status     VARCHAR(20) DEFAULT 'idle',  -- idle | active | finished | incident
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE assignment_workers (
 *   assignment_id VARCHAR(50) REFERENCES assignments(id) ON DELETE CASCADE,
 *   worker_name   VARCHAR(100),
 *   PRIMARY KEY (assignment_id, worker_name)
 * );
 *
 * -- Vista de analítica
 * CREATE VIEW analytics_summary AS
 * SELECT
 *   provider,
 *   DATE_TRUNC('month', TO_TIMESTAMP(start_time/1000)) AS month,
 *   COUNT(*)                                            AS total_unloads,
 *   AVG((end_time - start_time) / 60000.0)             AS avg_minutes
 * FROM assignments
 * WHERE status = 'finished'
 * GROUP BY provider, month
 * ORDER BY month DESC, avg_minutes ASC;
 */

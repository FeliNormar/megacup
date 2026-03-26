/**
 * Utilidades de formato de fecha y tiempo.
 * Todas usan el locale del dispositivo (es-MX) para consistencia.
 */

/** Formatea timestamp → "HH:MM:SS" */
export function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('es-MX', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** Formatea timestamp → "DD/MM/YYYY" */
export function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('es-MX', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

/** Formatea timestamp → "DD/MM/YYYY HH:MM" */
export function fmtDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('es-MX', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Formatea milisegundos en duración legible.
 * Ejemplos: "45s", "3m 20s", "1h 23m 45s"
 */
export function fmtDuration(ms) {
  if (!ms || ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h        = Math.floor(totalSec / 3600)
  const m        = Math.floor((totalSec % 3600) / 60)
  const s        = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Formatea milisegundos → "HH:MM:SS" (para el cronómetro en vivo).
 * Ejemplo: "01:23:45"
 */
export function fmtElapsed(ms) {
  if (!ms || ms < 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h        = Math.floor(totalSec / 3600)
  const m        = Math.floor((totalSec % 3600) / 60)
  const s        = totalSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/**
 * Calcula el promedio de minutos de descarga para un proveedor en un mes/año.
 * @param {Array}  records  - Historial de descargas
 * @param {string} provider - Nombre del proveedor
 * @param {number} month    - Mes (0-11)
 * @param {number} year     - Año (ej. 2025)
 */
export function avgMinutesByProvider(records, provider, month, year) {
  const filtered = records.filter((r) => {
    if (r.provider !== provider || !r.startTime || !r.endTime) return false
    const d = new Date(r.startTime)
    return d.getMonth() === month && d.getFullYear() === year
  })
  if (!filtered.length) return 0
  const total = filtered.reduce((acc, r) => acc + (r.endTime - r.startTime), 0)
  return Math.round(total / filtered.length / 60_000)
}

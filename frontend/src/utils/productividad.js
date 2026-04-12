/**
 * Utilidades de productividad normalizada.
 * Permite comparar equipos con distintas categorías de carga de forma justa.
 *
 * Fórmula: puntos = cajas × factor_peso
 * Productividad = puntos / minutos_trabajados
 */

/** Factor multiplicador por categoría de carga */
export const PESO_FACTORES = {
  'Ligero':      1.0,
  'Semi pesado': 2.5,
  'Pesado':      4.0,
}

/**
 * Obtiene las cajas asignadas a un operador en un registro.
 * Respeta la lógica existente: cajasXDescargador / cajasXEstibador / división equitativa.
 */
export function getCajasWorker(record, workerName) {
  const descargadores = record.descargadores ?? record.workers ?? []
  const estibadores   = record.estibadores   ?? []
  const cajasReales   = record.cajas_reales  ?? 0
  const esDesc  = descargadores.includes(workerName)
  const esEstib = estibadores.includes(workerName)
  if (esDesc && descargadores.length > 0)
    return cajasReales / descargadores.length
  if (esEstib && estibadores.length > 0)
    return cajasReales / estibadores.length
  if (cajasReales > 0 && record.workers?.length > 0)
    return cajasReales / record.workers.length
  return 0
}

/**
 * Calcula los puntos de productividad de un registro para un operador.
 * puntos = cajas × factor_peso
 */
export function calcPuntosRecord(record, workerName) {
  const tipoCarga = record.tipoCarga || record.tipo_carga || 'Ligero'
  const factor    = PESO_FACTORES[tipoCarga] ?? 1.0
  const cajas     = getCajasWorker(record, workerName)
  return cajas * factor
}

/**
 * Calcula la duración en minutos de un registro.
 */
export function getDuracionMin(record) {
  if (!record.startTime || !record.endTime) return 0
  return (record.endTime - record.startTime) / 60000
}

/**
 * Calcula el resumen de productividad de un operador para un conjunto de registros.
 * Retorna: { puntosTotales, minutosTotales, ptsPorMin, cajasTotales, descargas }
 */
export function calcResumenWorker(records, workerName) {
  const myRecords = records.filter(
    (r) => r.workers?.includes(workerName) && r.endTime && r.startTime && r.status === 'finished'
  )

  let puntosTotales = 0
  let minutosTotales = 0
  let cajasTotales = 0

  myRecords.forEach((r) => {
    puntosTotales  += calcPuntosRecord(r, workerName)
    minutosTotales += getDuracionMin(r)
    cajasTotales   += getCajasWorker(r, workerName)
  })

  const ptsPorMin = minutosTotales > 0 ? puntosTotales / minutosTotales : 0

  return {
    puntosTotales:  Math.round(puntosTotales),
    minutosTotales: Math.round(minutosTotales),
    ptsPorMin:      Math.round(ptsPorMin * 10) / 10,
    cajasTotales,
    descargas:      myRecords.length,
  }
}

/**
 * Filtra registros del día de hoy (por startTime).
 */
export function recordsDeHoy(records) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return records.filter((r) => r.startTime >= hoy.getTime())
}

/**
 * Genera el ranking del día para todos los operadores que participaron.
 * Retorna array ordenado de mayor a menor puntos totales:
 * [{ workerName, ptsPorMin, puntosTotales, cajasTotales, minutosTotales, descargas }]
 */
export function calcRankingDia(records) {
  const hoy = recordsDeHoy(records).filter((r) => r.status === 'finished')

  const operadores = [...new Set(hoy.flatMap((r) => r.workers || []))]

  const ranking = operadores.map((name) => {
    const res = calcResumenWorker(hoy, name)
    return { workerName: name, ...res }
  })

  return ranking.sort((a, b) => b.puntosTotales - a.puntosTotales)
}

/**
 * Retorna la posición (1-based) de un operador en el ranking del día.
 * Si no hay datos, retorna null.
 */
export function getPosicionRanking(records, workerName) {
  const ranking = calcRankingDia(records)
  const idx = ranking.findIndex((r) => r.workerName === workerName)
  return idx >= 0 ? idx + 1 : null
}


/** Emoji de medalla según posición */
export function medallaRanking(pos) {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return `#${pos}`
}

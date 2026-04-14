/**
 * Utilidades de productividad normalizada.
 * Permite comparar equipos con distintas categorías de carga de forma justa.
 *
 * Fórmula: puntos = cajas × factor_peso
 * Productividad = puntos / minutos_trabajados
 */

/** Factor multiplicador por categoría de carga.
 *  Fallback hardcodeado — se sobreescribe con configPuntos de Supabase cuando está disponible. */
export const PESO_FACTORES = {
  'Ligero':      1.0,
  'Semi pesado': 2.5,
  'Pesado':      4.0,
}

/**
 * Obtiene el factor de peso para un tipo de carga.
 * Usa configPuntos de Supabase si está disponible, si no usa PESO_FACTORES como fallback.
 */
export function getFactorCarga(tipoCarga, configPuntos) {
  if (configPuntos) {
    const map = {
      'Ligero':      configPuntos.ligero      ?? 1.0,
      'Semi pesado': configPuntos.semi_pesado ?? 2.5,
      'Pesado':      configPuntos.pesado      ?? 4.0,
    }
    return map[tipoCarga] ?? 1.0
  }
  return PESO_FACTORES[tipoCarga] ?? 1.0
}

/**
 * Obtiene las cajas asignadas a un operador en un registro.
 * Respeta la lógica existente: cajasXDescargador / cajasXEstibador / división equitativa.
 */
export function getCajasWorker(record, workerName) {
  const descargadores = record.descargadores ?? record.workers ?? []
  const estibadores   = record.estibadores   ?? []
  const cajasReales   = record.cajas_reales ?? record.cajasReales ?? record.cajas_estimadas ?? record.cajasEstimadas ?? 0
  // combine both roles into one pool and divide equally
  const todosLosWorkers = [...new Set([...descargadores, ...estibadores])]
  const esMiembro = todosLosWorkers.some((w) => w.toLowerCase().trim() === workerName.toLowerCase().trim())
  if (!esMiembro || todosLosWorkers.length === 0) return 0
  return cajasReales / todosLosWorkers.length
}

/**
 * Calcula los puntos de productividad de un registro para un operador.
 * puntos = cajas × factor_peso
 */
export function calcPuntosRecord(record, workerName, configPuntos) {
  const tipoCarga = record.tipo_carga ?? record.tipoCarga ?? 'Ligero'
  const factor    = getFactorCarga(tipoCarga, configPuntos)
  const cajas     = getCajasWorker(record, workerName)
  return cajas * factor
}

/**
 * Calcula la duración en minutos de un registro.
 */
export function getDuracionMin(record) {
  const start = record.startTime ?? record.start_time
  const end   = record.endTime   ?? record.end_time
  if (!start || !end) return 0
  return (end - start) / 60000
}

/**
 * Calcula la productividad en vivo de una descarga activa.
 * Usa cajas_asignadas y el tiempo transcurrido desde startTime.
 */
export function calcProductividadEnVivo(assignment, configPuntos) {
  const ahora   = Date.now()
  const minutos = (ahora - assignment.startTime) / 60000
  if (minutos <= 0) return null

  const cajas         = assignment.cajas_asignadas ?? 0
  const descargadores = assignment.descargadores ?? assignment.workers ?? []
  const estibadores   = assignment.estibadores   ?? []
  const totalPersonas = descargadores.length + estibadores.length
  if (totalPersonas === 0) return null

  const factor = getFactorCarga(assignment.tipo_carga, configPuntos)

  const cajasXHoraTotal     = (cajas / minutos) * 60
  const cajasXHoraXPersona  = cajasXHoraTotal / totalPersonas
  const puntosXHoraXPersona = cajasXHoraXPersona * factor
  const cajasEstimadas = assignment.cajas_estimadas ?? assignment.cajasEstimadas ?? 0
  const minutosEstimados    = cajas > 0 && cajasEstimadas > 0
    ? (cajasEstimadas / cajas) * minutos
    : null

  return {
    cajasXHoraTotal:      Math.round(cajasXHoraTotal * 10) / 10,
    cajasXHoraXPersona:   Math.round(cajasXHoraXPersona * 10) / 10,
    puntosXHoraXPersona:  Math.round(puntosXHoraXPersona * 10) / 10,
    minutosTranscurridos: Math.round(minutos),
    cajasAsignadas:       cajas,
    totalPersonas,
    cajasEstimadas,
    minutosEstimados:     minutosEstimados ? Math.round(minutosEstimados) : null,
  }
}

/**
 * Calcula el resumen de productividad de un operador.
 * Incluye descargas terminadas (records) y activas (assignments) del día.
 * Retorna: { puntosTotales, minutosTotales, ptsPorMin, cajasTotales, descargas }
 */
export function calcResumenWorker(records, workerName, assignments = [], configPuntos) {
  const nameLower = workerName.toLowerCase()
  const myRecords = records.filter(
    (r) => (r.endTime ?? r.end_time) && (r.startTime ?? r.start_time) && r.status === 'finished'
    && r.workers?.some((w) => w.toLowerCase() === nameLower)
  )

  let puntosTotales = 0
  let minutosTotales = 0
  let cajasTotales = 0

  myRecords.forEach((r) => {
    puntosTotales  += calcPuntosRecord(r, workerName, configPuntos)
    minutosTotales += getDuracionMin(r)
    cajasTotales   += getCajasWorker(r, workerName)
  })

  // Sumar descargas activas en vivo
  assignments
    .filter((a) => a.status === 'active' && a.workers?.includes(workerName) && (a.cajas_asignadas ?? 0) > 0)
    .forEach((a) => {
      const vivo = calcProductividadEnVivo(a, configPuntos)
      if (!vivo) return
      const factor = getFactorCarga(a.tipo_carga, configPuntos)
      const cajasWorker = (a.cajas_asignadas ?? 0) / vivo.totalPersonas
      puntosTotales  += cajasWorker * factor
      minutosTotales += vivo.minutosTranscurridos
      cajasTotales   += cajasWorker
    })

  const ptsPorMin = minutosTotales > 0 ? puntosTotales / minutosTotales : 0

  return {
    puntosTotales:  Math.round(puntosTotales),
    minutosTotales: Math.round(minutosTotales),
    ptsPorMin:      Math.round(ptsPorMin * 10) / 10,
    cajasTotales:   Math.round(cajasTotales),
    descargas:      myRecords.length,
  }
}

/**
 * Filtra registros del día de hoy (por startTime).
 */
export function recordsDeHoy(records) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return records.filter((r) => (r.startTime ?? r.start_time) >= hoy.getTime())
}

/**
 * Genera el ranking del día para todos los operadores que participaron.
 * Retorna array ordenado de mayor a menor puntos totales:
 * [{ workerName, ptsPorMin, puntosTotales, cajasTotales, minutosTotales, descargas }]
 */
export function calcRankingDia(records, assignments = [], configPuntos) {
  const hoy = recordsDeHoy(records).filter((r) => r.status === 'finished')

  const hoyTs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const desdeActivos = assignments
    .filter((a) => a.status === 'active' && a.startTime >= hoyTs)
    .flatMap((a) => a.workers || [])
  const seen = new Map()
  ;[...hoy.flatMap((r) => r.workers || []), ...desdeActivos].forEach((name) => {
    const key = name.toLowerCase()
    if (!seen.has(key)) seen.set(key, name)
  })
  const operadores = [...seen.values()]

  const ranking = operadores.map((name) => {
    const res = calcResumenWorker(hoy, name, assignments, configPuntos)
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

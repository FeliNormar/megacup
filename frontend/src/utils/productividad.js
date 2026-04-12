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
  // support both snake_case (new) and camelCase (old historical records)
  const cajasReales   = record.cajas_reales  ?? record.cajasReales ?? 0
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
  const tipoCarga = record.tipo_carga ?? record.tipoCarga ?? 'Ligero'
  const factor    = PESO_FACTORES[tipoCarga] ?? 1.0
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
export function calcProductividadEnVivo(assignment) {
  const ahora   = Date.now()
  const minutos = (ahora - assignment.startTime) / 60000
  if (minutos <= 0) return null

  const cajas         = assignment.cajas_asignadas ?? 0
  const descargadores = assignment.descargadores ?? assignment.workers ?? []
  const estibadores   = assignment.estibadores   ?? []
  const totalPersonas = descargadores.length + estibadores.length
  if (totalPersonas === 0) return null

  const factor = PESO_FACTORES[assignment.tipo_carga] ?? 1.0

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
export function calcResumenWorker(records, workerName, assignments = []) {
  const myRecords = records.filter(
    (r) => (r.endTime ?? r.end_time) && (r.startTime ?? r.start_time) && r.status === 'finished'
    && r.workers?.includes(workerName)
  )

  let puntosTotales = 0
  let minutosTotales = 0
  let cajasTotales = 0

  myRecords.forEach((r) => {
    puntosTotales  += calcPuntosRecord(r, workerName)
    minutosTotales += getDuracionMin(r)
    cajasTotales   += getCajasWorker(r, workerName)
  })

  // Sumar descargas activas en vivo
  assignments
    .filter((a) => a.status === 'active' && a.workers?.includes(workerName) && (a.cajas_asignadas ?? 0) > 0)
    .forEach((a) => {
      const vivo = calcProductividadEnVivo(a)
      if (!vivo) return
      const factor = PESO_FACTORES[a.tipo_carga] ?? 1.0
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
export function calcRankingDia(records, assignments = []) {
  const hoy = recordsDeHoy(records).filter((r) => r.status === 'finished')

  // Operadores de records terminados + activos del día
  const hoyTs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const desdeActivos = assignments
    .filter((a) => a.status === 'active' && a.startTime >= hoyTs)
    .flatMap((a) => a.workers || [])
  const operadores = [...new Set([...hoy.flatMap((r) => r.workers || []), ...desdeActivos])]

  const ranking = operadores.map((name) => {
    const res = calcResumenWorker(hoy, name, assignments)
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

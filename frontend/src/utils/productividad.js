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
  const esDesc  = record.descargadores?.includes(workerName)
  const esEstib = record.estibadores?.includes(workerName)

  // Primero intentar campos pre-calculados
  if (esDesc  && (record.cajasXDescargador || record.cajas_x_descargador))
    return record.cajasXDescargador || record.cajas_x_descargador
  if (esEstib && (record.cajasXEstibador || record.cajas_x_estibador))
    return record.cajasXEstibador || record.cajas_x_estibador

  // Calcular en tiempo real si hay cajas reales y roles definidos
  const cajasReales = record.cajasReales || record.cajas_reales
  if (cajasReales) {
    if (esDesc  && record.descargadores?.length > 0)
      return Math.round(cajasReales / record.descargadores.length)
    if (esEstib && record.estibadores?.length > 0)
      return Math.round(cajasReales / record.estibadores.length)
    // Sin roles específicos: división equitativa entre todos los workers
    if (record.workers?.includes(workerName) && record.workers.length > 0)
      return Math.round(cajasReales / record.workers.length)
  }
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
 * Suma los puntos y cajas del trailer del día para un operador.
 * trailersCierre: array de registros de TrailerCierreModal
 */
export function getPuntosTrailerWorker(trailersCierre = [], workerName) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return trailersCierre
    .filter((t) => t.timestamp >= hoy.getTime() && t.gruposActivos?.includes(workerName))
    .reduce(
      (acc, t) => ({
        puntos: acc.puntos + (t.puntosXGrupo || 0),
        cajas:  acc.cajas  + (t.cajasPorGrupo || 0),
      }),
      { puntos: 0, cajas: 0 }
    )
}

/**
 * Genera el ranking del día para todos los operadores que participaron.
 * Incluye puntos del trailer de cierre para un ranking 100% justo.
 * trailersCierre es opcional — si no se pasa, el ranking ignora el trailer.
 *
 * Retorna array ordenado de mayor a menor pts totales (descargas + trailer):
 * [{ workerName, ptsPorMin, puntosTotales, puntosTotalesConTrailer, cajasTotales, minutos, puntosTrailer, cajasTrailer }]
 */
export function calcRankingDia(records, trailersCierre = []) {
  const hoy = recordsDeHoy(records).filter((r) => r.status === 'finished')

  // Recopilar todos los operadores únicos del día
  // (incluir también los que solo aparecen en trailers)
  const desdeRecords  = hoy.flatMap((r) => r.workers || [])
  const desdeTrailers = trailersCierre
    .filter((t) => { const h = new Date(); h.setHours(0,0,0,0); return t.timestamp >= h.getTime() })
    .flatMap((t) => t.gruposActivos || [])
  const operadores = [...new Set([...desdeRecords, ...desdeTrailers])]

  const ranking = operadores.map((name) => {
    const res     = calcResumenWorker(hoy, name)
    const trailer = getPuntosTrailerWorker(trailersCierre, name)
    return {
      workerName:               name,
      ...res,
      puntosTrailer:            trailer.puntos,
      cajasTrailer:             trailer.cajas,
      puntosTotalesConTrailer:  res.puntosTotales + trailer.puntos,
      cajasTotalesConTrailer:   res.cajasTotales  + trailer.cajas,
    }
  })

  // Ordenar por puntos totales (descargas + trailer)
  return ranking.sort((a, b) => b.puntosTotalesConTrailer - a.puntosTotalesConTrailer)
}

/**
 * Retorna la posición (1-based) de un operador en el ranking del día.
 * Si no hay datos, retorna null.
 */
export function getPosicionRanking(records, workerName, trailersCierre = []) {
  const ranking = calcRankingDia(records, trailersCierre)
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

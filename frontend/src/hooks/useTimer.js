import { useState, useEffect, useRef } from 'react'

const timerKey = (id) => `app_timer_${id}`

/**
 * useTimer — Cronómetro persistente en tiempo real.
 *
 * Guarda el startTime en localStorage para que el cronómetro
 * sobreviva cierres de Chrome o apagados del dispositivo.
 * Al reabrir la app, el tiempo transcurrido se calcula correctamente.
 *
 * @param {string}      id        - ID único de la asignación
 * @param {number|null} startTime - Timestamp ms de inicio (null = detenido)
 * @returns {number} Milisegundos transcurridos desde startTime
 */
export function useTimer(id, startTime) {
  const [elapsed, setElapsed] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!startTime) {
      setElapsed(0)
      return
    }

    // Persiste para recuperar tras cierre de app
    try { localStorage.setItem(timerKey(id), String(startTime)) } catch (_) {}

    const tick = () => {
      setElapsed(Date.now() - startTime)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [id, startTime])

  return elapsed
}

/**
 * Recupera el startTime guardado en localStorage para una asignación.
 * Útil al reabrir la app con descargas activas.
 */
export function recoverTimer(id) {
  try {
    const value = localStorage.getItem(timerKey(id))
    return value ? Number(value) : null
  } catch {
    return null
  }
}

/** Elimina el timer guardado al finalizar una descarga. */
export function clearTimer(id) {
  try { localStorage.removeItem(timerKey(id)) } catch (_) {}
}

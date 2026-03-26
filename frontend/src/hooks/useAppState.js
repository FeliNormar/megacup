import { useState, useEffect } from 'react'
import axios from 'axios'
import { ls, uid } from '../utils/storage'
import { clearTimer, recoverTimer } from './useTimer'
import {
  DEFAULT_WORKERS,
  DEFAULT_NAVES,
  DEFAULT_PROVIDERS,
  DEFAULT_ADMIN,
} from '../constants/defaults'

/**
 * useAppState — Estado global de la aplicación.
 *
 * Centraliza toda la lógica de negocio: sesión, descargas,
 * configuración y persistencia. App.jsx solo consume este hook.
 */
export function useAppState() {
  // ── Tema ──────────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(() =>
    ls.get('mc_dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
  )

  // ── Sesión ────────────────────────────────────────────────────────────────
  const [session, setSession] = useState(null)
  // session: { role: 'admin' | 'worker', workerId?, workerName? }

  // ── Configuración ─────────────────────────────────────────────────────────
  const [workers,   setWorkers]   = useState(() => ls.get('mc_workers',   DEFAULT_WORKERS))
  const [naves,     setNaves]     = useState(() => ls.get('mc_naves',     DEFAULT_NAVES))
  const [providers, setProviders] = useState(() => ls.get('mc_providers', DEFAULT_PROVIDERS))
  const [adminCred, setAdminCred] = useState(() => ls.get('mc_admin',     DEFAULT_ADMIN))

  // ── Descargas activas ─────────────────────────────────────────────────────
  // Estructura: { [naveId]: Assignment }
  // Assignment: { id, naveId, naveName, provider, product, po, workers[], startTime, endTime?, status }
  const [assignments, setAssignments] = useState(() => {
    const saved = ls.get('mc_assignments', {})
    // Recuperar timers que sobrevivieron un cierre de app
    Object.values(saved).forEach((a) => {
      if (a.status === 'active' && !a.startTime) {
        const recovered = recoverTimer(a.id)
        if (recovered) a.startTime = recovered
      }
    })
    return saved
  })

  // ── Historial ─────────────────────────────────────────────────────────────
  const [records, setRecords] = useState(() => ls.get('mc_records', []))

  // ── Persistencia automática ───────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    ls.set('mc_dark', dark)
  }, [dark])

  useEffect(() => { ls.set('mc_assignments', assignments) }, [assignments])
  useEffect(() => { ls.set('mc_records',     records)     }, [records])
  useEffect(() => { ls.set('mc_workers',     workers)     }, [workers])
  useEffect(() => { ls.set('mc_naves',       naves)       }, [naves])
  useEffect(() => { ls.set('mc_providers',   providers)   }, [providers])
  useEffect(() => { ls.set('mc_admin',       adminCred)   }, [adminCred])

  // ── Acciones de descarga ──────────────────────────────────────────────────

  /**
   * Crea una nueva descarga activa.
   * La hora de inicio se toma del dispositivo que confirma (Date.now()).
   */
  const createDescarga = (data) => {
    const assignment = {
      id:        uid(),
      ...data,
      startTime: Date.now(),
      status:    'active',
    }
    setAssignments((prev) => ({ ...prev, [data.naveId]: assignment }))
    axios.post('/api/assignments', assignment).catch(() => {})
  }

  /** Finaliza una descarga correctamente. */
  const finishDescarga = (naveId) => {
    setAssignments((prev) => {
      const a = prev[naveId]
      if (!a) return prev

      const record = { ...a, endTime: Date.now(), status: 'finished' }
      setRecords((r) => [record, ...r])
      clearTimer(a.id)
      axios.post('/api/records', record).catch(() => {})

      const next = { ...prev }
      delete next[naveId]
      return next
    })
  }

  /** Registra una incidencia y cierra la descarga. */
  const reportIncident = (naveId) => {
    setAssignments((prev) => {
      const a = prev[naveId]
      if (!a) return prev

      const record = { ...a, endTime: Date.now(), status: 'incident' }
      setRecords((r) => [record, ...r])
      clearTimer(a.id)
      axios.post('/api/records', record).catch(() => {})

      const next = { ...prev }
      delete next[naveId]
      return next
    })
  }

  // ── Vistas derivadas ──────────────────────────────────────────────────────

  /** Descargas visibles según el rol del usuario. */
  const visibleAssignments = (() => {
    const active = Object.values(assignments).filter(
      (a) => a.status === 'active' || a.status === 'idle'
    )
    if (!session || session.role === 'admin') return active
    return active.filter((a) => a.workers?.includes(session.workerName))
  })()

  return {
    // Estado
    dark, setDark,
    session, setSession,
    workers,   setWorkers,
    naves,     setNaves,
    providers, setProviders,
    adminCred, setAdminCred,
    assignments,
    records,

    // Acciones
    createDescarga,
    finishDescarga,
    reportIncident,

    // Derivados
    visibleAssignments,
    activeNaveIds: Object.keys(assignments),
    isAdmin:  session?.role === 'admin',
    isWorker: session?.role === 'worker',
  }
}

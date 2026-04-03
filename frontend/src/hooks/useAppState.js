import { useState, useEffect } from 'react'
import { ls, uid } from '../utils/storage'
import { clearTimer, recoverTimer } from './useTimer'
import {
  DEFAULT_WORKERS,
  DEFAULT_NAVES,
  DEFAULT_PROVIDERS,
  DEFAULT_ADMIN,
} from '../constants/defaults'
import { supabase } from '../utils/supabase'

/**
 * useAppState — Estado global de la aplicación.
 *
 * Centraliza toda la lógica de negocio: gestión de sesiones, descargas,
 * configuración y persistencia en la nube (Supabase) + local (localStorage).
 */
export function useAppState() {
  const [dark, setDark] = useState(() =>
    ls.get('mc_dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
  )

  const [session, setSession] = useState(null)
  
  const [workers,   setWorkers]   = useState(() => ls.get('mc_workers',   DEFAULT_WORKERS))
  const [naves,     setNaves]     = useState(() => ls.get('mc_naves',     DEFAULT_NAVES))
  const [providers, setProviders] = useState(() => ls.get('mc_providers', DEFAULT_PROVIDERS))
  const [adminCred, setAdminCred] = useState(() => ls.get('mc_admin',     DEFAULT_ADMIN))

  const [assignments, setAssignments] = useState(() => {
    const saved = ls.get('mc_assignments', {})
    Object.values(saved).forEach((a) => {
      if (a.status === 'active' && !a.startTime) {
        const recovered = recoverTimer(a.id)
        if (recovered) a.startTime = recovered
      }
    })
    return saved
  })
  const [records, setRecords] = useState(() => ls.get('mc_records', []))

  // ── Sincronización Inicial con Supabase ────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        // Cargar descargas activas
        const { data: activeData } = await supabase.from('assignments').select('*').eq('status', 'active')
        if (activeData && activeData.length > 0) {
          const map = {}
          activeData.forEach(a => map[a.naveId] = a)
          setAssignments(map)
        }
        // Cargar historial
        const { data: recordsData } = await supabase.from('records').select('*').order('endTime', { ascending: false }).limit(100)
        if (recordsData && recordsData.length > 0) setRecords(recordsData)
        // Cargar workers
        const { data: workersData } = await supabase.from('workers').select('*')
        if (workersData && workersData.length > 0) {
          setWorkers(workersData)
          ls.set('mc_workers', workersData)
        }
      } catch (err) {
        console.error('Error cargando datos de Supabase:', err)
      }
    }
    fetchData()
  }, [])

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

  // Guarda workers en Supabase al cambiar
  const updateWorkers = async (newWorkers) => {
    setWorkers(newWorkers)
    ls.set('mc_workers', newWorkers)
    // Reemplaza todos los workers en Supabase
    await supabase.from('workers').delete().neq('id', '')
    if (newWorkers.length > 0) await supabase.from('workers').insert(newWorkers)
  }

  const createDescarga = async (data) => {
    const assignment = {
      id:        uid(),
      ...data,
      startTime: Date.now(),
      status:    'active',
    }
    setAssignments((prev) => ({ ...prev, [data.naveId]: assignment }))
    
    // Guardar en Supabase
    await supabase.from('assignments').insert([assignment])
  }

  const finishDescarga = async (naveId) => {
    const a = assignments[naveId]
    if (!a) return

    const record = { ...a, endTime: Date.now(), status: 'finished' }
    setAssignments((prev) => {
      const next = { ...prev }; delete next[naveId]; return next
    })
    setRecords((r) => [record, ...r])
    clearTimer(a.id)

    // Actualizar en Supabase
    await supabase.from('assignments').delete().eq('id', a.id)
    await supabase.from('records').insert([record])
  }

  const reportIncident = async (naveId) => {
    const a = assignments[naveId]
    if (!a) return

    const record = { ...a, endTime: Date.now(), status: 'incident' }
    setAssignments((prev) => {
      const next = { ...prev }; delete next[naveId]; return next
    })
    setRecords((r) => [record, ...r])
    clearTimer(a.id)

    // Actualizar en Supabase
    await supabase.from('assignments').delete().eq('id', a.id)
    await supabase.from('records').insert([record])
  }

  // ── Vistas derivadas ──────────────────────────────────────────────────────

  /** Descargas visibles según el rol del usuario. */
  const visibleAssignments = (() => {
    const active = Object.values(assignments).filter(
      (a) => a.status === 'active' || a.status === 'idle'
    )
    if (!session || session.role === 'admin' || session.role === 'almacenista') return active
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
    updateWorkers,

    // Derivados
    visibleAssignments,
    activeNaveIds: Object.keys(assignments),
    isAdmin:  session?.role === 'admin',
    isAlmacenista: session?.role === 'almacenista',
    isWorker: session?.role === 'worker',
  }
}

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
import { loadSession, clearSession, hashPassword } from '../utils/auth'

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

  const [session, setSession] = useState(() => loadSession())

  const logout = () => {
    clearSession()
    setSession(null)
  }
  
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
        const { data: activeData } = await supabase.from('assignments').select('*').eq('status', 'active').is('deleted_at', null)
        if (activeData && activeData.length > 0) {
          const map = {}
          activeData.forEach(a => map[a.naveId] = a)
          setAssignments(map)
        }
        const { data: recordsData } = await supabase.from('records').select('*').is('deleted_at', null).order('endTime', { ascending: false }).limit(100)
        if (recordsData && recordsData.length > 0) setRecords(recordsData)
        // Cargar workers
        const { data: workersData } = await supabase.from('workers').select('*')
        if (workersData && workersData.length > 0) {
          setWorkers(workersData)
          ls.set('mc_workers', workersData)
        }
        // Cargar credenciales admin
        const { data: adminData } = await supabase.from('config').select('value').eq('key', 'admin').single()
        if (adminData?.value) {
          setAdminCred(adminData.value)
          ls.set('mc_admin', adminData.value)
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

  // Guarda workers en Supabase al cambiar — hashea contraseñas nuevas
  const updateWorkers = async (newWorkers) => {
    // Hashear contraseñas que no estén hasheadas aún
    const hashed = await Promise.all(newWorkers.map(async (w) => {
      if (w.pwd && !w.pwd.startsWith('$2')) {
        return { ...w, pwd: await hashPassword(w.pwd) }
      }
      return w
    }))
    setWorkers(hashed)
    ls.set('mc_workers', hashed)
    try {
      await supabase.from('workers').delete().neq('id', '')
      if (hashed.length > 0) {
        const { error } = await supabase.from('workers').insert(hashed)
        if (error) console.error('Error guardando workers:', error)
      }
    } catch (err) {
      console.error('Error sync workers:', err)
    }
  }

  const updateAdmin = async (newCred) => {
    // Hashear pin si no está hasheado
    const credToSave = { ...newCred }
    if (credToSave.pin && !credToSave.pin.startsWith('$2')) {
      credToSave.pin = await hashPassword(credToSave.pin)
    }
    setAdminCred(credToSave)
    ls.set('mc_admin', credToSave)
    try {
      await supabase.from('config').upsert({ key: 'admin', value: credToSave })
    } catch (err) {
      console.error('Error sync admin:', err)
    }
  }

  const createDescarga = async (data) => {
    const assignment = {
      id:        uid(),
      ...data,
      startTime: Date.now(),
      status:    'active',
    }
    setAssignments((prev) => ({ ...prev, [data.naveId]: assignment }))
    await supabase.from('assignments').insert([assignment])
  }

  const finishDescarga = async (naveId) => {
    const a = assignments[naveId]
    if (!a) return
    const record = { ...a, endTime: Date.now(), status: 'finished' }
    setAssignments((prev) => { const next = { ...prev }; delete next[naveId]; return next })
    setRecords((r) => [record, ...r])
    clearTimer(a.id)
    await supabase.from('assignments').delete().eq('id', a.id)
    await supabase.from('records').insert([record])
  }

  const reportIncident = async (naveId) => {
    const a = assignments[naveId]
    if (!a) return
    const record = { ...a, endTime: Date.now(), status: 'incident' }
    setAssignments((prev) => { const next = { ...prev }; delete next[naveId]; return next })
    setRecords((r) => [record, ...r])
    clearTimer(a.id)
    await supabase.from('assignments').delete().eq('id', a.id)
    await supabase.from('records').insert([record])
  }

  // Soft delete — nunca borra físicamente
  const softDeleteAssignment = async (naveId) => {
    const a = assignments[naveId]
    if (!a) return
    setAssignments((prev) => { const next = { ...prev }; delete next[naveId]; return next })
    clearTimer(a.id)
    await supabase.from('assignments').update({ deleted_at: new Date().toISOString() }).eq('id', a.id)
  }

  const softDeleteRecord = async (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('records').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  }

  // Editar descarga activa
  const editAssignment = async (naveId, changes) => {
    const a = assignments[naveId]
    if (!a) return
    const updated = { ...a, ...changes }
    setAssignments((prev) => ({ ...prev, [naveId]: updated }))
    await supabase.from('assignments').update(changes).eq('id', a.id)
  }

  // Editar registro del historial
  const editRecord = async (id, changes) => {
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...changes } : r))
    await supabase.from('records').update(changes).eq('id', id)
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
    session, setSession, logout,
    workers,   setWorkers,
    naves,     setNaves,
    providers, setProviders,
    adminCred, setAdminCred,
    assignments, setAssignments,
    records,

    // Acciones
    createDescarga,
    finishDescarga,
    reportIncident,
    softDeleteAssignment,
    softDeleteRecord,
    editAssignment,
    editRecord,
    updateWorkers,
    updateAdmin,

    // Derivados
    visibleAssignments,
    activeNaveIds: Object.keys(assignments),
    isAdmin:  session?.role === 'admin',
    isAlmacenista: session?.role === 'almacenista',
    isWorker: session?.role === 'worker',
  }
}

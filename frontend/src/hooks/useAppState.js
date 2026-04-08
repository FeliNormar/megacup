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
import { insertLog } from '../utils/auditLog'

// Versión del caché — incrementar cuando haya cambios de esquema
const CACHE_VERSION = '3'

function clearObsoleteCache() {
  try {
    const v = localStorage.getItem('mc_cache_version')
    if (v !== CACHE_VERSION) {
      // Limpiar solo cachés locales, nunca datos de sesión
      ;['mc_assignments', 'mc_records', 'mc_workers', 'mc_naves', 'mc_providers'].forEach(
        (k) => localStorage.removeItem(k)
      )
      // Limpiar timers huérfanos
      Object.keys(localStorage)
        .filter((k) => k.startsWith('app_timer_'))
        .forEach((k) => localStorage.removeItem(k))
      localStorage.setItem('mc_cache_version', CACHE_VERSION)
    }
  } catch (_) {}
}

clearObsoleteCache()

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

  const [assignments, setAssignments] = useState({})
  const [records, setRecords] = useState(() => ls.get('mc_records', []))

  // ── Sincronización Inicial con Supabase ────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: activeData } = await supabase.from('assignments').select('*').eq('status', 'active').is('deleted_at', null)
        if (activeData) {
          const map = {}
          activeData.forEach(a => {
            // Normalizar snake_case a camelCase
            const normalized = {
              ...a,
              tipoCarga:      a.tipo_carga      || a.tipoCarga,
              cajasEstimadas: a.cajas_estimadas || a.cajasEstimadas,
            }
            map[a.naveId] = normalized
          })
          setAssignments(map)
          ls.set('mc_assignments', map)
        } else {
          setAssignments({})
          ls.set('mc_assignments', {})
        }
        const { data: recordsData } = await supabase.from('records').select('*').is('deleted_at', null).order('endTime', { ascending: false }).limit(100)
        if (recordsData && recordsData.length > 0) setRecords(recordsData)
        const { data: workersData } = await supabase.from('workers').select('*')
        if (workersData && workersData.length > 0) {
          setWorkers(workersData)
          ls.set('mc_workers', workersData)
        }
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

    // ── Realtime: sincronizar assignments en todos los dispositivos ──────────
    const channel = supabase
      .channel('assignments-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assignments' }, (payload) => {
        const a = payload.new
        if (a.deleted_at || a.status !== 'active') return
        setAssignments((prev) => ({ ...prev, [a.naveId]: a }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assignments' }, (payload) => {
        const a = payload.new
        setAssignments((prev) => {
          const next = { ...prev }
          if (a.deleted_at || a.status !== 'active') {
            // Buscar y eliminar por id
            Object.keys(next).forEach((k) => { if (next[k].id === a.id) delete next[k] })
          } else {
            next[a.naveId] = a
          }
          return next
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'assignments' }, (payload) => {
        const id = payload.old?.id
        setAssignments((prev) => {
          const next = { ...prev }
          Object.keys(next).forEach((k) => { if (next[k].id === id) delete next[k] })
          return next
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    // Protección: nunca borrar si el array viene vacío
    if (!newWorkers || newWorkers.length === 0) {
      setWorkers([])
      ls.set('mc_workers', [])
      return
    }
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
      const { error } = await supabase.from('workers').insert(hashed)
      if (error) console.error('Error guardando workers:', error)
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
    const assignment = { id: uid(), ...data, startTime: Date.now(), status: 'active' }
    setAssignments((prev) => ({ ...prev, [data.naveId]: assignment }))
    // Mapear camelCase a snake_case para Supabase
    const row = {
      id:               assignment.id,
      naveId:           assignment.naveId,
      naveName:         assignment.naveName,
      provider:         assignment.provider,
      product:          assignment.product,
      po:               assignment.po || null,
      workers:          assignment.workers || [],
      descargadores:    assignment.descargadores || [],
      estibadores:      assignment.estibadores || [],
      startTime:        assignment.startTime,
      status:           'active',
      tipo_carga:       assignment.tipoCarga || null,
      cajas_estimadas:  assignment.cajasEstimadas || null,
    }
    const { error } = await supabase.from('assignments').insert([row])
    if (error) console.error('Error guardando descarga:', error)
    insertLog(assignment.id, session?.workerName || 'admin', 'creada')
  }

  const finishDescarga = async (naveId, cajasReales = null) => {
    const a = assignments[naveId]
    if (!a) return

    const descargadores = a.descargadores || []
    const estibadores   = a.estibadores   || []
    const cajasXDescarg = cajasReales && descargadores.length > 0
      ? Math.round(cajasReales / descargadores.length) : null
    const cajasXEstib   = cajasReales && estibadores.length > 0
      ? Math.round(cajasReales / estibadores.length) : null

    const record = {
      ...a,
      endTime: Date.now(),
      status:  'finished',
      cajasReales:       cajasReales       || null,
      cajasXDescargador: cajasXDescarg     || null,
      cajasXEstibador:   cajasXEstib       || null,
    }
    setAssignments((prev) => { const next = { ...prev }; delete next[naveId]; return next })
    setRecords((r) => [record, ...r])
    clearTimer(a.id)
    await supabase.from('assignments').delete().eq('id', a.id)

    // Mapear a snake_case para Supabase
    const row = {
      id:                  record.id,
      naveId:              record.naveId,
      naveName:            record.naveName,
      provider:            record.provider,
      product:             record.product,
      po:                  record.po || null,
      workers:             record.workers || [],
      descargadores:       record.descargadores || [],
      estibadores:         record.estibadores || [],
      startTime:           record.startTime,
      endTime:             record.endTime,
      status:              'finished',
      tipo_carga:          record.tipoCarga || record.tipo_carga || null,
      cajas_estimadas:     record.cajasEstimadas || record.cajas_estimadas || null,
      cajas_reales:        cajasReales || null,
      cajas_x_descargador: cajasXDescarg || null,
      cajas_x_estibador:   cajasXEstib || null,
    }
    const { error } = await supabase.from('records').insert([row])
    if (error) console.error('Error guardando record:', error)
    insertLog(a.id, session?.workerName || 'admin', 'finalizada', cajasReales ? `${cajasReales} cajas` : '')
  }

  const reportIncident = async (naveId, fotoUrl = null) => {
    const a = assignments[naveId]
    if (!a) return
    const record = {
      ...a,
      endTime: Date.now(),
      status:  'incident',
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
    }
    setAssignments((prev) => { const next = { ...prev }; delete next[naveId]; return next })
    setRecords((r) => [record, ...r])
    clearTimer(a.id)
    await supabase.from('assignments').delete().eq('id', a.id)

    // Mapear a snake_case para Supabase
    const row = {
      id:           record.id,
      naveId:       record.naveId,
      naveName:     record.naveName,
      provider:     record.provider,
      product:      record.product,
      po:           record.po || null,
      workers:      record.workers || [],
      descargadores: record.descargadores || [],
      estibadores:  record.estibadores || [],
      startTime:    record.startTime,
      endTime:      record.endTime,
      status:       'incident',
      tipo_carga:   record.tipoCarga || record.tipo_carga || null,
      cajas_estimadas: record.cajasEstimadas || record.cajas_estimadas || null,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
    }
    const { error } = await supabase.from('records').insert([row])
    if (error) console.error('Error guardando incidencia:', error)
    insertLog(a.id, session?.workerName || 'admin', 'incidencia')
  }

  const softDeleteAssignment = async (naveId) => {
    const a = assignments[naveId]
    if (!a) return
    setAssignments((prev) => { const next = { ...prev }; delete next[naveId]; return next })
    clearTimer(a.id)
    await supabase.from('assignments').update({ deleted_at: new Date().toISOString() }).eq('id', a.id)
    insertLog(a.id, session?.workerName || 'admin', 'eliminada')
  }

  const softDeleteRecord = async (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('records').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    insertLog(id, session?.workerName || 'admin', 'eliminada')
  }

  const editAssignment = async (naveId, changes) => {
    const a = assignments[naveId]
    if (!a) return
    const updated = { ...a, ...changes }
    setAssignments((prev) => ({ ...prev, [naveId]: updated }))
    // Mapear a snake_case para Supabase
    const supabaseChanges = { ...changes }
    if (changes.tipoCarga !== undefined)      supabaseChanges.tipo_carga      = changes.tipoCarga
    if (changes.cajasEstimadas !== undefined) supabaseChanges.cajas_estimadas = changes.cajasEstimadas
    await supabase.from('assignments').update(supabaseChanges).eq('id', a.id)
    insertLog(a.id, session?.workerName || 'admin', 'editada', JSON.stringify(changes))
  }

  const editRecord = async (id, changes) => {
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...changes } : r))
    // Mapear a snake_case para Supabase
    const supabaseChanges = {}
    if (changes.cajasEstimadas  !== undefined) supabaseChanges.cajas_estimadas     = changes.cajasEstimadas
    if (changes.cajasReales     !== undefined) supabaseChanges.cajas_reales        = changes.cajasReales
    if (changes.cajasXDescargador !== undefined) supabaseChanges.cajas_x_descargador = changes.cajasXDescargador
    if (changes.cajasXEstibador !== undefined) supabaseChanges.cajas_x_estibador   = changes.cajasXEstibador
    if (changes.descargadores   !== undefined) supabaseChanges.descargadores       = changes.descargadores
    if (changes.estibadores     !== undefined) supabaseChanges.estibadores         = changes.estibadores
    if (changes.tipoCarga       !== undefined) supabaseChanges.tipo_carga          = changes.tipoCarga
    if (changes.provider        !== undefined) supabaseChanges.provider            = changes.provider
    if (changes.product         !== undefined) supabaseChanges.product             = changes.product
    if (changes.po              !== undefined) supabaseChanges.po                  = changes.po
    if (changes.workers         !== undefined) supabaseChanges.workers             = changes.workers
    // Campos que ya vienen en snake_case desde HistorialFilters
    if (changes.cajas_estimadas     !== undefined) supabaseChanges.cajas_estimadas     = changes.cajas_estimadas
    if (changes.cajas_reales        !== undefined) supabaseChanges.cajas_reales        = changes.cajas_reales
    if (changes.cajas_x_descargador !== undefined) supabaseChanges.cajas_x_descargador = changes.cajas_x_descargador
    if (changes.cajas_x_estibador   !== undefined) supabaseChanges.cajas_x_estibador   = changes.cajas_x_estibador
    const { error } = await supabase.from('records').update(supabaseChanges).eq('id', id)
    if (error) console.error('Error editando record:', error)
    insertLog(id, session?.workerName || 'admin', 'editada', JSON.stringify(changes))
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

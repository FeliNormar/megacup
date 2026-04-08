import { useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { toast } from '../components/ToastContainer'

/**
 * Suscribe al operador a cambios en tiempo real de assignments.
 * Solo activo para rol 'worker'.
 */
export function useRealtime({ session, onNewAssignment }) {
  useEffect(() => {
    if (!session || session.role !== 'worker') return

    const channel = supabase
      .channel('assignments-realtime')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'assignments',
      }, (payload) => {
        const a = payload.new
        // Solo notificar si el operador está en la lista
        if (!a.workers?.includes(session.workerName)) return

        // Vibración
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])

        // Toast — solo notificación visual, el estado lo maneja useAppState Realtime
        toast(`Nueva descarga asignada — Nave ${a.naveName || a.naveId} · ${a.provider || ''}`)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session?.workerName])
}

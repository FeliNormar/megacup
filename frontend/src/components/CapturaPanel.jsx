import { useState, useEffect } from 'react'
import { Plus, CheckCircle, Loader } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { uid } from '../utils/storage'

/**
 * CapturaPanel — Vista del operador para registrar cajas bajadas en tiempo real.
 * NO muestra cantidades esperadas del manifiesto (solo el admin las ve).
 */
export default function CapturaPanel({ assignment, workerName }) {
  const [manifiesto,  setManifiesto]  = useState([])   // productos del manifiesto
  const [capturas,    setCapturas]    = useState([])   // capturas ya registradas
  const [cantidad,    setCantidad]    = useState({})   // { productoId: string }
  const [saving,      setSaving]      = useState({})   // { productoId: bool }
  const [loading,     setLoading]     = useState(true)

  // Cargar manifiesto y capturas existentes
  useEffect(() => {
    if (!assignment?.id) return
    async function load() {
      setLoading(true)
      const [{ data: mData }, { data: cData }] = await Promise.all([
        supabase.from('manifiestos').select('*').eq('assignment_id', assignment.id),
        supabase.from('capturas').select('*').eq('assignment_id', assignment.id),
      ])
      setManifiesto(mData || [])
      setCapturas(cData || [])
      setLoading(false)
    }
    load()

    // Realtime: escuchar nuevas capturas (sin filtro para evitar errores de replica identity)
    const channel = supabase
      .channel(`capturas-${assignment.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'capturas',
      }, (payload) => {
        if (payload.new.assignment_id === assignment.id) {
          setCapturas(prev => {
            if (prev.find(c => c.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [assignment?.id])

  // Total capturado por producto
  const totalPorProducto = (productoId) =>
    capturas.filter(c => c.producto_id === productoId).reduce((acc, c) => acc + c.cantidad, 0)

  const handleCaptura = async (prod) => {
    const cant = parseInt(cantidad[prod.producto_id]) || 0
    if (cant <= 0) return
    setSaving(prev => ({ ...prev, [prod.producto_id]: true }))
    const row = {
      id:            uid(),
      assignment_id: assignment.id,
      producto_id:   prod.producto_id,
      nombre:        prod.nombre,
      sku:           prod.sku || null,
      cantidad:      cant,
      operador:      workerName,
    }
    try {
      const { error } = await supabase.from('capturas').insert([row])
      if (!error) {
        setCapturas(prev => [...prev, row])
        setCantidad(prev => ({ ...prev, [prod.producto_id]: '' }))
      } else {
        console.error('Error registrando captura:', error)
      }
    } catch (err) {
      console.error('Error registrando captura:', err)
    } finally {
      setSaving(prev => ({ ...prev, [prod.producto_id]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-[#8fa3b1]">
        <Loader size={20} className="animate-spin mr-2" /> Cargando productos...
      </div>
    )
  }

  if (manifiesto.length === 0) {
    return (
      <div className="text-center py-6 text-[#8fa3b1] text-sm">
        <p>Esta descarga no tiene manifiesto de productos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8fa3b1] font-semibold uppercase tracking-wide">📦 Registra lo que vas bajando</p>

      {manifiesto.map((prod) => {
        const total = totalPorProducto(prod.producto_id)
        const isSaving = saving[prod.producto_id]
        const historial = capturas.filter(c => c.producto_id === prod.producto_id)

        return (
          <div key={prod.producto_id} className="rounded-2xl border border-[#8fa3b1]/20 bg-white dark:bg-[#162050] overflow-hidden">
            {/* Header producto */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a3a8f]/5 dark:bg-[#1a3a8f]/20">
              <div>
                <p className="font-bold text-sm text-[#1a3a8f] dark:text-white">{prod.nombre}</p>
                {prod.sku && <p className="text-[10px] text-[#8fa3b1] font-mono">{prod.sku}</p>}
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#1a3a8f] dark:text-white">{total}</p>
                <p className="text-[10px] text-[#8fa3b1]">cajas bajadas</p>
              </div>
            </div>

            {/* Historial de capturas */}
            {historial.length > 0 && (
              <div className="px-4 py-2 border-b border-[#8fa3b1]/10">
                <div className="flex flex-wrap gap-1">
                  {historial.map((c) => (
                    <span key={c.id} className="flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                      <CheckCircle size={9} /> +{c.cantidad} {c.operador !== workerName && `(${c.operador})`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Input captura */}
            <div className="flex items-center gap-2 px-4 py-3">
              <input
                type="number" min="1"
                value={cantidad[prod.producto_id] || ''}
                onChange={(e) => setCantidad(prev => ({ ...prev, [prod.producto_id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleCaptura(prod)}
                placeholder="¿Cuántas cajas?"
                className="flex-1 rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#2563c4] outline-none"
              />
              <button
                onClick={() => handleCaptura(prod)}
                disabled={isSaving || !cantidad[prod.producto_id]}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}
              >
                {isSaving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Registrar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

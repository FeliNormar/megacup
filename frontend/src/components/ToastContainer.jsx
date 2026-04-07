import { useState, useEffect, useCallback } from 'react'
import { X, Truck } from 'lucide-react'

let addToastFn = null

export function toast(message, duration = 5000) {
  if (addToastFn) addToastFn({ message, duration, id: Date.now() })
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  addToastFn = useCallback((t) => {
    setToasts((prev) => [...prev.slice(-2), t]) // max 3
  }, [])

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="fixed top-20 right-3 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '320px' }}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  )
}

function Toast({ toast: t, onClose }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const step = 100 / (t.duration / 100)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) { clearInterval(interval); onClose(); return 0 }
        return p - step
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="pointer-events-auto bg-[#162050] border border-[#8fa3b1]/30 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(-20px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms ease, opacity 200ms ease',
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Truck size={18} className="text-[#2563c4] shrink-0 mt-0.5" />
        <p className="text-white text-sm flex-1">{t.message}</p>
        <button onClick={onClose} className="text-[#8fa3b1] hover:text-white shrink-0">
          <X size={15} />
        </button>
      </div>
      <div className="h-1 bg-[#8fa3b1]/20">
        <div
          className="h-full bg-[#2563c4] transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

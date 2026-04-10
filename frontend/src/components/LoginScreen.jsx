import React, { useState } from 'react'
import { Lock, User, ChevronRight, Eye, EyeOff, Loader, HardHat, Package, ShieldCheck } from 'lucide-react'
import { verifyPassword, saveSession } from '../utils/auth'
import { supabase } from '../utils/supabase'

const MODES = [
  { id: 'worker',  label: 'Operador', icon: HardHat },
  { id: 'almacen', label: 'Almacén',  icon: Package },
  { id: 'admin',   label: 'Admin',    icon: ShieldCheck },
]

function getDeviceInfo() {
  const ua = navigator.userAgent
  // Detectar modelo/sistema
  const android = ua.match(/Android.*?;\s([^)]+)\)/)
  const iphone  = ua.match(/iPhone OS ([\d_]+)/)
  const ipad    = ua.match(/iPad.*OS ([\d_]+)/)
  // Detectar navegador
  const chrome  = ua.match(/Chrome\/([\d.]+)/)
  const safari  = ua.match(/Version\/([\d.]+).*Safari/)
  const firefox = ua.match(/Firefox\/([\d.]+)/)

  let device = 'Desconocido'
  if (android)      device = android[1].trim()
  else if (iphone)  device = `iPhone iOS ${iphone[1].replace(/_/g, '.')}`
  else if (ipad)    device = `iPad iOS ${ipad[1].replace(/_/g, '.')}`
  else if (/Windows/.test(ua)) device = 'Windows PC'
  else if (/Mac/.test(ua))     device = 'Mac'

  let browser = ''
  if (chrome)       browser = `Chrome ${chrome[1].split('.')[0]}`
  else if (safari)  browser = `Safari ${safari[1].split('.')[0]}`
  else if (firefox) browser = `Firefox ${firefox[1].split('.')[0]}`

  return `${device}${browser ? ' / ' + browser : ''}`
}

export default function LoginScreen({ workers, adminCred, almacenCred, onLogin }) {
  const [mode,     setMode]     = useState('worker')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const clear = () => { setUsername(''); setPassword(''); setError('') }

  const handleWorker = async () => {
    const w = workers.find((x) => x.name.toLowerCase() === username.trim().toLowerCase())
    if (!w) { setError('Usuario no encontrado'); return }
    setLoading(true)
    const ok = await verifyPassword(password, w.pwd || w.password || '')
    setLoading(false)
    if (!ok) { setError('Contraseña incorrecta'); setPassword(''); return }
    // Guardar dispositivo y hora de login
    const device = getDeviceInfo()
    supabase.from('workers').update({
      last_device: device,
      last_login:  new Date().toISOString(),
    }).eq('id', w.id).then(() => {})
    const sessionUser = { role: 'worker', workerId: w.id, workerName: w.name }
    saveSession(sessionUser)
    onLogin(sessionUser)
  }

  const handleAdmin = async () => {
    if (username.trim() !== adminCred.username) { setError('Usuario o contraseña incorrectos'); setPassword(''); return }
    setLoading(true)
    const ok = await verifyPassword(password, adminCred.pin || '')
    setLoading(false)
    if (!ok) { setError('Usuario o contraseña incorrectos'); setPassword(''); return }
    const sessionUser = { role: 'admin' }
    saveSession(sessionUser)
    onLogin(sessionUser)
  }

  const handleAlmacen = async () => {
    if (!almacenCred?.username) { setError('Credenciales no disponibles'); return }
    if (username.trim() !== almacenCred.username) { setError('Credenciales incorrectas'); setPassword(''); return }
    setLoading(true)
    const ok = await verifyPassword(password, almacenCred.pin || '')
    setLoading(false)
    if (!ok) { setError('Credenciales incorrectas'); setPassword(''); return }
    const sessionUser = { role: 'almacenista' }
    saveSession(sessionUser)
    onLogin(sessionUser)
  }

  const handle = () => {
    if (mode === 'admin')   handleAdmin()
    else if (mode === 'almacen') handleAlmacen()
    else handleWorker()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1b3e] p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="MEGA CUP" className="h-32 mx-auto mb-2 drop-shadow-xl" />
        <div className="text-[#8fa3b1] text-sm mt-1">Sistema de Gestión de Bodegas</div>
      </div>

      <div className="w-full max-w-sm bg-[#162050] rounded-2xl p-6 shadow-2xl border border-[#8fa3b1]/20 space-y-4">
        {/* Toggle con íconos */}
        <div className="flex rounded-xl overflow-hidden border border-[#8fa3b1]/30">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setMode(id); clear() }}
              className={`flex-1 flex flex-col items-center py-2.5 gap-1 text-[11px] font-semibold transition-colors ${
                mode === id ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'
              }`}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Usuario */}
        <div>
          <label className="block text-xs text-[#8fa3b1] mb-1 font-semibold uppercase tracking-wide">Usuario</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3b1]" />
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError('') }}
              placeholder={mode === 'admin' ? 'admin' : 'Tu nombre de usuario'}
              className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-[#0d1b3e] text-white pl-9 pr-4 py-3 text-sm focus:border-[#2563c4] outline-none"
            />
          </div>
        </div>

        {/* Contraseña */}
        <div>
          <label className="block text-xs text-[#8fa3b1] mb-1 font-semibold uppercase tracking-wide">Contraseña</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3b1]" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handle()}
              placeholder="••••••"
              className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-[#0d1b3e] text-white pl-9 pr-10 py-3 text-sm focus:border-[#2563c4] outline-none"
            />
            <button onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8fa3b1]">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
            <span className="text-red-400 text-lg">⚠️</span>
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        <button onClick={handle}
          disabled={loading}
          className="touch-target w-full rounded-xl text-white font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
          {loading ? <Loader size={17} className="animate-spin" /> : (mode === 'admin' ? <Lock size={17} /> : <User size={17} />)}
          {loading ? 'Verificando...' : 'Ingresar'} {!loading && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  )
}

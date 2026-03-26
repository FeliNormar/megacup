import React, { useState } from 'react'
import { Lock, User, ChevronRight, Eye, EyeOff } from 'lucide-react'

export default function LoginScreen({ workers, adminCred, onLogin }) {
  const [mode,     setMode]     = useState('worker')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')

  const clear = () => { setUsername(''); setPassword(''); setError('') }

  const handleWorker = () => {
    const w = workers.find((x) => x.name.toLowerCase() === username.trim().toLowerCase())
    if (!w)              { setError('Usuario no encontrado'); return }
    if (w.password !== password) { setError('Contraseña incorrecta'); setPassword(''); return }
    onLogin({ role: 'worker', workerId: w.id, workerName: w.name })
  }

  const handleAdmin = () => {
    if (username.trim() === adminCred.username && password === adminCred.pin) {
      onLogin({ role: 'admin' })
    } else {
      setError('Usuario o contraseña incorrectos')
      setPassword('')
    }
  }

  const handle = mode === 'admin' ? handleAdmin : handleWorker

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1b3e] p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="Logo" className="h-32 mx-auto mb-2 drop-shadow-xl" />
        <div className="text-[#8fa3b1] text-sm mt-1">Sistema de Gestión de Bodegas</div>
      </div>

      <div className="w-full max-w-sm bg-[#162050] rounded-2xl p-6 shadow-2xl border border-[#8fa3b1]/20 space-y-4">
        {/* Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-[#8fa3b1]/30">
          {[['worker', 'Operador'], ['admin', 'Administrador']].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); clear() }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'
              }`}>
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

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button onClick={handle}
          className="touch-target w-full rounded-xl text-white font-bold py-3 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
          {mode === 'admin' ? <Lock size={17} /> : <User size={17} />}
          Ingresar <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Package, Users, Warehouse, Lock, Eye, EyeOff, RefreshCw, ClipboardList } from 'lucide-react'

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

function Section({ icon: Icon, title, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2 text-[#1a3a8f] dark:text-[#8fa3b1] font-bold text-sm uppercase tracking-wide">
          <Icon size={15} />{title}
        </div>
        {open ? <ChevronUp size={16} className="text-[#8fa3b1]" /> : <ChevronDown size={16} className="text-[#8fa3b1]" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-[#8fa3b1]/10 pt-3">{children}</div>}
    </div>
  )
}

// ── Naves ─────────────────────────────────────────────────────────────────────
function NavesList({ naves, onChange }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (!v) return
    onChange([...naves, { id: uid(), name: v }])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Nombre de la nave (ej. Nave Norte)..."
          className="flex-1 rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none" />
        <button onClick={add} className="touch-target px-4 rounded-xl bg-[#1a3a8f] text-white"><Plus size={16} /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {naves.map((n) => (
          <span key={n.id} className="flex items-center gap-1 bg-[#1a3a8f]/10 dark:bg-[#8fa3b1]/10 text-[#1a3a8f] dark:text-[#8fa3b1] px-3 py-1 rounded-full text-sm">
            {n.name}
            <button onClick={() => onChange(naves.filter((x) => x.id !== n.id))} className="text-red-400 hover:text-red-600 ml-1"><Trash2 size={11} /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Operadores con credenciales ───────────────────────────────────────────────
function WorkersList({ workers, onChange }) {
  const [name,    setName]    = useState('')
  const [pass,    setPass]    = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [editId,  setEditId]  = useState(null)
  const [editPwd, setEditPwd] = useState('')

  const add = () => {
    const n = name.trim()
    const p = pass.trim()
    if (!n || !p) return
    onChange([...workers, { id: uid(), name: n, pwd: p }])
    setName(''); setPass('')
  }

  const remove = (id) => onChange(workers.filter((w) => w.id !== id))

  const saveEdit = (id) => {
    if (!editPwd.trim()) return
    onChange(workers.map((w) => w.id === id ? { ...w, pwd: editPwd.trim() } : w))
    setEditId(null); setEditPwd('')
  }

  const updatePhone = (id, phone) =>
    onChange(workers.map((w) => w.id === id ? { ...w, phone } : w))

  return (
    <div className="space-y-3">
      {/* Agregar */}
      <div className="rounded-xl border border-[#8fa3b1]/20 p-3 space-y-2">
        <p className="text-xs font-semibold text-[#8fa3b1] uppercase tracking-wide">Nuevo operador</p>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo"
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none" />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={showPwd ? 'text' : 'password'} value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Contraseña"
              className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 pr-9 text-sm focus:border-[#1a3a8f] outline-none" />
            <button onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8fa3b1]">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button onClick={add} className="touch-target px-4 rounded-xl bg-[#1a3a8f] text-white"><Plus size={16} /></button>
        </div>
      </div>

      {/* Lista */}
      {workers.map((w) => (
        <WorkerRow key={w.id} w={w}
          editId={editId} editPwd={editPwd}
          setEditId={setEditId} setEditPwd={setEditPwd}
          onRemove={remove} onSaveEdit={saveEdit}
          onUpdatePhone={updatePhone}
        />
      ))}
    </div>
  )
}

// ── Fila de operador con ver contraseña ──────────────────────────────────────
function WorkerRow({ w, editId, editPwd, setEditId, setEditPwd, onRemove, onSaveEdit, onUpdatePhone }) {
  const [showCurrent, setShowCurrent] = useState(false)
  const [editPhone,   setEditPhone]   = useState(false)
  const [phone,       setPhone]       = useState(w.phone || '')
  const isHashed = (w.pwd || '').startsWith('$2')

  const savePhone = () => {
    onUpdatePhone(w.id, phone.trim())
    setEditPhone(false)
  }

  return (
    <div className="rounded-xl border border-[#8fa3b1]/20 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm text-[#1a3a8f] dark:text-white">{w.name}</span>
        <div className="flex gap-2 items-center">
          <button onClick={() => { setEditId(editId === w.id ? null : w.id); setEditPwd('') }}
            className="text-xs text-[#2563c4] dark:text-[#8fa3b1] underline">
            {editId === w.id ? 'Cancelar' : 'Cambiar pwd'}
          </button>
          <button onClick={() => onRemove(w.id)} className="text-red-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Contraseña actual */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[#8fa3b1]">Contraseña:</span>
        {isHashed ? (
          <span className="text-xs text-[#8fa3b1] italic">cifrada (cambia para ver)</span>
        ) : (
          <span className="text-xs font-mono text-slate-700 dark:text-white">
            {showCurrent ? (w.pwd || w.password) : '••••••'}
          </span>
        )}
        {!isHashed && (
          <button onClick={() => setShowCurrent((v) => !v)} className="text-[#8fa3b1] hover:text-white">
            {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>

      {/* Último dispositivo */}
      {w.last_device && (
        <div className="mt-1 rounded-lg bg-[#8fa3b1]/10 px-2 py-1.5">
          <p className="text-xs text-[#8fa3b1]">
            📱 <span className="font-semibold text-slate-700 dark:text-white">{w.last_device}</span>
          </p>
          {w.last_login && (
            <p className="text-xs text-[#8fa3b1]">
              🕐 {new Date(w.last_login).toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true })}
            </p>
          )}
        </div>
      )}

      {/* Teléfono WhatsApp */}
      <div className="flex items-center gap-2 mt-1">        <span className="text-xs text-[#8fa3b1]">WhatsApp:</span>
        {editPhone ? (
          <div className="flex gap-1 flex-1">
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="521XXXXXXXXXX"
              className="flex-1 rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1 text-xs focus:border-[#1a3a8f] outline-none"
            />
            <button onClick={savePhone} className="px-2 rounded-lg bg-[#1a3a8f] text-white text-xs"><Save size={12} /></button>
            <button onClick={() => setEditPhone(false)} className="text-[#8fa3b1] text-xs">✕</button>
          </div>
        ) : (
          <>
            <span className="text-xs font-mono text-slate-700 dark:text-white">{w.phone || '—'}</span>
            <button onClick={() => setEditPhone(true)} className="text-xs text-[#2563c4] dark:text-[#8fa3b1] underline">
              {w.phone ? 'Editar' : 'Agregar'}
            </button>
          </>
        )}
      </div>

      {editId === w.id && (
        <div className="flex gap-2 mt-2">
          <input type="text" value={editPwd} onChange={(e) => setEditPwd(e.target.value)}
            placeholder="Nueva contraseña"
            className="flex-1 rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1.5 text-xs focus:border-[#1a3a8f] outline-none" />
          <button onClick={() => onSaveEdit(w.id)}
            className="px-3 rounded-lg bg-[#1a3a8f] text-white text-xs font-bold">
            <Save size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Proveedores + Productos ───────────────────────────────────────────────────
function ProviderEditor({ providers, onChange }) {
  const [newProv,    setNewProv]    = useState('')
  const [newProduct, setNewProduct] = useState({})

  const addProvider = () => {
    const v = newProv.trim()
    if (!v) return
    onChange([...providers, { id: uid(), name: v, products: [] }])
    setNewProv('')
  }
  const removeProvider = (id) => onChange(providers.filter((p) => p.id !== id))
  const addProduct = (provId) => {
    const v = (newProduct[provId] || '').trim()
    if (!v) return
    onChange(providers.map((p) => p.id === provId ? { ...p, products: [...p.products, v] } : p))
    setNewProduct((prev) => ({ ...prev, [provId]: '' }))
  }
  const removeProduct = (provId, prod) =>
    onChange(providers.map((p) => p.id === provId ? { ...p, products: p.products.filter((x) => x !== prod) } : p))

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={newProv} onChange={(e) => setNewProv(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addProvider()}
          placeholder="Nombre del proveedor..."
          className="flex-1 rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none" />
        <button onClick={addProvider} className="touch-target px-4 rounded-xl bg-[#1a3a8f] text-white"><Plus size={16} /></button>
      </div>
      {providers.map((prov) => (
        <div key={prov.id} className="rounded-xl border border-[#8fa3b1]/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-[#1a3a8f] dark:text-white">{prov.name}</span>
            <button onClick={() => removeProvider(prov.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {prov.products.map((pr) => (
              <span key={pr} className="flex items-center gap-1 bg-[#2563c4]/10 text-[#2563c4] dark:text-[#8fa3b1] text-xs px-2 py-0.5 rounded-full">
                {pr}
                <button onClick={() => removeProduct(prov.id, pr)} className="text-red-400 ml-0.5"><Trash2 size={9} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newProduct[prov.id] || ''}
              onChange={(e) => setNewProduct((prev) => ({ ...prev, [prov.id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addProduct(prov.id)}
              placeholder="Agregar producto..."
              className="flex-1 rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1.5 text-xs focus:border-[#1a3a8f] outline-none" />
            <button onClick={() => addProduct(prov.id)}
              className="px-3 rounded-lg bg-[#2563c4]/20 text-[#2563c4] dark:text-[#8fa3b1] text-xs font-bold">
              + Producto
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function SettingsPanel({ workers, naves, providers, adminCred, onUpdateWorkers, onUpdateNaves, onUpdateProviders, onUpdateAdmin, onImportRecord }) {
  const [newUser, setNewUser] = useState('')
  const [newPin,  setNewPin]  = useState('')
  const [msg,     setMsg]     = useState('')

  const saveAdmin = () => {
    if (!newUser.trim() && !newPin.trim()) return
    if (newPin && newPin.length < 4) { setMsg('La contraseña debe tener al menos 4 caracteres'); return }
    onUpdateAdmin({ username: newUser.trim() || adminCred.username, pin: newPin.trim() || adminCred.pin })
    setNewUser(''); setNewPin('')
    setMsg('Credenciales actualizadas')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="space-y-4 pb-8">
      <Section icon={Warehouse} title="Naves / Bodegas">
        <NavesList naves={naves} onChange={onUpdateNaves} />
      </Section>

      <Section icon={Users} title="Operadores">
        <WorkersList workers={workers} onChange={onUpdateWorkers} />
      </Section>

      <Section icon={Package} title="Proveedores y Productos">
        <ProviderEditor providers={providers} onChange={onUpdateProviders} />
      </Section>

      <Section icon={Lock} title="Credenciales de Administrador">
        <p className="text-xs text-[#8fa3b1]">Usuario actual: <strong className="text-[#1a3a8f] dark:text-white">{adminCred.username}</strong></p>
        <input type="text" value={newUser} onChange={(e) => setNewUser(e.target.value)}
          placeholder="Nuevo usuario (vacío = sin cambio)"
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none" />
        <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)}
          placeholder="Nueva contraseña"
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none" />
        <button onClick={saveAdmin}
          className="touch-target w-full rounded-xl bg-[#1a3a8f] text-white font-semibold text-sm flex items-center justify-center gap-2">
          <Save size={15} /> Guardar Credenciales
        </button>
        {msg && <p className="text-xs text-center text-[#2563c4]">{msg}</p>}
      </Section>

      <Section icon={RefreshCw} title="Mantenimiento">        <p className="text-xs text-[#8fa3b1]">Si la app no carga bien o muestra datos desactualizados, limpia el caché del navegador.</p>
        <button
          onClick={async () => {
            try {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations()
                await Promise.all(regs.map((r) => r.unregister()))
              }
              if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((k) => caches.delete(k)))
              }
              localStorage.removeItem('app_version')
            } catch (e) {
              console.warn(e)
            }
            window.location.reload()
          }}
          className="touch-target w-full rounded-xl bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
        >
          <RefreshCw size={15} /> Limpiar caché y recargar
        </button>
      </Section>

      {onImportRecord && (
        <Section icon={ClipboardList} title="Agregar Registro Histórico">
          <ImportRecord workers={workers} naves={naves} providers={providers} onSave={onImportRecord} />
        </Section>
      )}
    </div>
  )
}

function ImportRecord({ workers, naves, providers, onSave }) {
  const toDatetimeLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const now = new Date()
  const oneHourAgo = new Date(now - 3600000)

  const [naveId,       setNaveId]       = useState(naves[0]?.id || '')
  const [provider,     setProvider]     = useState(providers[0]?.name || '')
  const [product,      setProduct]      = useState(providers[0]?.products?.[0] || '')
  const [po,           setPo]           = useState('')
  const [tipoCarga,    setTipoCarga]    = useState('')
  const [startVal,     setStartVal]     = useState(toDatetimeLocal(oneHourAgo))
  const [endVal,       setEndVal]       = useState(toDatetimeLocal(now))
  const [cajasEst,     setCajasEst]     = useState('')
  const [cajasReal,    setCajasReal]    = useState('')
  const [descarg,      setDescarg]      = useState([])
  const [estib,        setEstib]        = useState([])
  const [saving,       setSaving]       = useState(false)

  const selectedNave     = naves.find((n) => n.id === naveId)
  const selectedProvider = providers.find((p) => p.name === provider)

  const toggleDescarg = (name) => setDescarg((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])
  const toggleEstib   = (name) => setEstib((p)   => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])

  const handleSave = async () => {
    if (!naveId || !provider || !product || !startVal || !endVal) return
    setSaving(true)
    const ok = await onSave({
      naveId,
      naveName:      selectedNave?.name || naveId,
      provider,
      product,
      po,
      tipoCarga,
      startTime:     new Date(startVal).getTime(),
      endTime:       new Date(endVal).getTime(),
      cajasEstimadas: cajasEst  ? Number(cajasEst)  : null,
      cajasReales:    cajasReal ? Number(cajasReal) : null,
      workers:       [...new Set([...descarg, ...estib])],
      descargadores: descarg,
      estibadores:   estib,
    })
    setSaving(false)
    if (ok) {
      setPo(''); setTipoCarga(''); setCajasEst(''); setCajasReal('')
      setDescarg([]); setEstib([])
      setStartVal(toDatetimeLocal(oneHourAgo)); setEndVal(toDatetimeLocal(now))
    }
  }

  const inputCls = 'w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none'
  const labelCls = 'text-xs text-[#8fa3b1] font-semibold mb-1'

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8fa3b1]">Ingresa descargas pasadas para incluirlas en las métricas.</p>

      <div>
        <p className={labelCls}>Nave</p>
        <select value={naveId} onChange={(e) => setNaveId(e.target.value)} className={inputCls}>
          {naves.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>

      <div>
        <p className={labelCls}>Proveedor</p>
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setProduct(providers.find(p=>p.name===e.target.value)?.products?.[0]||'') }} className={inputCls}>
          {providers.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <p className={labelCls}>Producto</p>
        <select value={product} onChange={(e) => setProduct(e.target.value)} className={inputCls}>
          {(selectedProvider?.products || []).map((pr) => <option key={pr} value={pr}>{pr}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className={labelCls}>PO (opcional)</p>
          <input type="text" value={po} onChange={(e) => setPo(e.target.value)} placeholder="PO-123" className={inputCls} />
        </div>
        <div className="flex-1">
          <p className={labelCls}>Tipo carga</p>
          <select value={tipoCarga} onChange={(e) => setTipoCarga(e.target.value)} className={inputCls}>
            <option value="">—</option>
            <option value="Ligero">Ligero</option>
            <option value="Pesado">Pesado</option>
          </select>
        </div>
      </div>

      <div>
        <p className={labelCls}>🕐 Hora inicio</p>
        <input type="datetime-local" value={startVal} onChange={(e) => setStartVal(e.target.value)} className={inputCls} />
      </div>
      <div>
        <p className={labelCls}>🕐 Hora fin</p>
        <input type="datetime-local" value={endVal} onChange={(e) => setEndVal(e.target.value)} className={inputCls} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className={labelCls}>Cajas estimadas</p>
          <input type="number" value={cajasEst} onChange={(e) => setCajasEst(e.target.value)} placeholder="0" className={inputCls} />
        </div>
        <div className="flex-1">
          <p className={labelCls}>Cajas reales</p>
          <input type="number" value={cajasReal} onChange={(e) => setCajasReal(e.target.value)} placeholder="0" className={inputCls} />
        </div>
      </div>

      {workers.length > 0 && (
        <>
          <div>
            <p className={labelCls}>📥 Descargadores</p>
            <div className="flex flex-wrap gap-1">
              {workers.map((w) => (
                <button key={w.id} onClick={() => toggleDescarg(w.name)}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                    descarg.includes(w.name) ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white' : 'border-[#8fa3b1]/40 text-[#8fa3b1]'
                  }`}>
                  {w.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={labelCls}>🏗️ Estibadores</p>
            <div className="flex flex-wrap gap-1">
              {workers.map((w) => (
                <button key={w.id} onClick={() => toggleEstib(w.name)}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                    estib.includes(w.name) ? 'bg-[#2563c4] border-[#2563c4] text-white' : 'border-[#8fa3b1]/40 text-[#8fa3b1]'
                  }`}>
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving || !naveId || !provider || !product}
        className="touch-target w-full rounded-xl bg-[#1a3a8f] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        <ClipboardList size={15} /> {saving ? 'Guardando...' : 'Guardar Registro'}
      </button>
    </div>
  )
}

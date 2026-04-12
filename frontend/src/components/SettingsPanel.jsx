import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Save, ChevronDown, Package, Users, Warehouse, Lock, Eye, EyeOff, RefreshCw, ClipboardList, ShieldCheck } from 'lucide-react'

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

// ── Acordeón base ─────────────────────────────────────────────────────────────
function Accordion({ id, openId, setOpenId, icon: Icon, title, badge, children }) {
  const open = openId === id
  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden
      ${open ? 'border-indigo-300 dark:border-indigo-700 shadow-md' : 'border-slate-200 dark:border-slate-700 shadow-sm'}`}>
      <button
        onClick={() => setOpenId(open ? null : id)}
        className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors
          ${open ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-white dark:bg-[#162050] hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${open ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
            <Icon size={15} />
          </div>
          <span className={`font-semibold text-sm ${open ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
            {title}
          </span>
          {badge !== undefined && (
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 bg-white dark:bg-[#162050] space-y-3 border-t border-slate-100 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Naves como badges en grid ─────────────────────────────────────────────────
function NavesList({ naves, onChange }) {
  const [input, setInput] = useState('')
  const [deleteId, setDeleteId] = useState(null) // nave en modo "listo para borrar"

  const add = () => { const v = input.trim(); if (!v) return; onChange([...naves, { id: uid(), name: v }]); setInput('') }

  const handleLongPress = (id) => {
    if ('vibrate' in navigator) navigator.vibrate(80)
    setDeleteId(id)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">Mantén presionado una nave para eliminarla.</p>
      <div className="grid grid-cols-3 gap-2">
        {naves.map((n) => (
          <LongPressNave
            key={n.id}
            nave={n}
            isDeleting={deleteId === n.id}
            onLongPress={() => handleLongPress(n.id)}
            onCancel={() => setDeleteId(null)}
            onDelete={() => { onChange(naves.filter((x) => x.id !== n.id)); setDeleteId(null) }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Nueva nave..." className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <button onClick={add} className="px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"><Plus size={16} /></button>
      </div>
    </div>
  )
}

function LongPressNave({ nave, isDeleting, onLongPress, onCancel, onDelete }) {
  const timerRef = React.useRef(null)

  const startPress = () => {
    timerRef.current = setTimeout(() => onLongPress(), 600)
  }
  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  if (isDeleting) {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-900/20 py-3 px-2 text-center gap-1">
        <span className="font-bold text-sm text-red-600 dark:text-red-400 truncate">{nave.name}</span>
        <div className="flex gap-1">
          <button onClick={onDelete}
            className="px-2 py-0.5 rounded-lg bg-red-500 text-white text-xs font-bold">
            <Trash2 size={11} />
          </button>
          <button onClick={onCancel}
            className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs">
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchCancel={cancelPress}
      className="relative flex items-center justify-center rounded-xl border-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20 py-3 px-2 text-center cursor-pointer select-none active:scale-95 transition-transform"
    >
      <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300 truncate">{nave.name}</span>
    </div>
  )
}

// ── Operadores compactos ──────────────────────────────────────────────────────
function WorkersList({ workers, onChange }) {
  const [name, setName] = useState('')
  const [pass, setPass] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editPwd, setEditPwd] = useState('')

  const add = () => { const n = name.trim(), p = pass.trim(); if (!n || !p) return; onChange([...workers, { id: uid(), name: n, pwd: p }]); setName(''); setPass('') }
  const remove = (id) => onChange(workers.filter((w) => w.id !== id))
  const saveEdit = (id) => { if (!editPwd.trim()) return; onChange(workers.map((w) => w.id === id ? { ...w, pwd: editPwd.trim() } : w)); setEditId(null); setEditPwd('') }
  const updatePhone = (id, phone) => onChange(workers.map((w) => w.id === id ? { ...w, phone } : w))

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-3 space-y-2 bg-slate-50 dark:bg-slate-800/40">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nuevo operador</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={showPwd ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Contraseña"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 pr-9 text-sm outline-none focus:border-indigo-400" />
            <button onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button onClick={add} className="px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"><Plus size={16} /></button>
        </div>
      </div>
      <div className="space-y-2">
        {workers.map((w) => (
          <WorkerRow key={w.id} w={w} editId={editId} editPwd={editPwd}
            setEditId={setEditId} setEditPwd={setEditPwd}
            onRemove={remove} onSaveEdit={saveEdit} onUpdatePhone={updatePhone} />
        ))}
      </div>
    </div>
  )
}

function WorkerRow({ w, editId, editPwd, setEditId, setEditPwd, onRemove, onSaveEdit, onUpdatePhone }) {
  const [showCurrent, setShowCurrent] = useState(false)
  const [editPhone, setEditPhone] = useState(false)
  const [phone, setPhone] = useState(w.phone || '')
  const isHashed = (w.pwd || '').startsWith('$2')
  const savePhone = () => { onUpdatePhone(w.id, phone.trim()); setEditPhone(false) }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#162050] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm">
            {w.name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-white leading-none">{w.name}</p>
            {w.last_device && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[140px]">📱 {w.last_device}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditId(editId === w.id ? null : w.id); setEditPwd('') }}
            className="text-xs px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
            {editId === w.id ? 'Cancelar' : 'Pwd'}
          </button>
          <button onClick={() => onRemove(w.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {editId === w.id && (
        <div className="flex gap-2 px-3 pb-3">
          <input type="text" value={editPwd} onChange={(e) => setEditPwd(e.target.value)}
            placeholder="Nueva contraseña"
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
          <button onClick={() => onSaveEdit(w.id)} className="px-3 rounded-lg bg-indigo-600 text-white text-xs font-bold">
            <Save size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Proveedores ───────────────────────────────────────────────────────────────
function ProviderEditor({ providers, onChange }) {
  const [newProv, setNewProv] = useState('')
  const [newProd, setNewProd] = useState({}) // { provId: { nombre, sku, tipo } }

  const addProvider = () => {
    const v = newProv.trim()
    if (!v) return
    onChange([...providers, { id: uid(), name: v, products: [] }])
    setNewProv('')
  }
  const removeProvider = (id) => onChange(providers.filter((p) => p.id !== id))

  const addProduct = (provId) => {
    const p = newProd[provId] || {}
    const nombre = (p.nombre || '').trim()
    if (!nombre) return
    const producto = { id: uid(), nombre, sku: (p.sku || '').trim(), tipo: p.tipo || 'Ligero' }
    onChange(providers.map((pr) => pr.id === provId ? { ...pr, products: [...(pr.products || []), producto] } : pr))
    setNewProd(prev => ({ ...prev, [provId]: { nombre: '', sku: '', tipo: 'Ligero' } }))
  }

  const removeProduct = (provId, prodId) =>
    onChange(providers.map((pr) => pr.id === provId
      ? { ...pr, products: pr.products.filter((x) => (x.id || x) !== prodId) }
      : pr))

  // Normaliza producto — puede ser string (legacy) u objeto nuevo
  const normProd = (p) => typeof p === 'string' ? { id: p, nombre: p, sku: '', tipo: 'Ligero' } : p

  const tipoBadge = { Ligero: 'bg-green-100 text-green-700', 'Semi-Pesado': 'bg-yellow-100 text-yellow-700', Pesado: 'bg-red-100 text-red-700' }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={newProv} onChange={(e) => setNewProv(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProvider()}
          placeholder="Nombre del proveedor..."
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <button onClick={addProvider} className="px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"><Plus size={16} /></button>
      </div>

      {providers.map((prov) => {
        const np = newProd[prov.id] || { nombre: '', sku: '', tipo: 'Ligero' }
        return (
          <div key={prov.id} className="rounded-xl border border-slate-200 dark:border-slate-600 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-800 dark:text-white">{prov.name}</span>
              <button onClick={() => removeProvider(prov.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>

            {/* Lista de productos */}
            <div className="space-y-1">
              {(prov.products || []).map((pr) => {
                const p = normProd(pr)
                return (
                  <div key={p.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-700 dark:text-white truncate">{p.nombre}</span>
                      {p.sku && <span className="text-[10px] text-slate-400 font-mono shrink-0">{p.sku}</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${tipoBadge[p.tipo] || tipoBadge.Ligero}`}>{p.tipo}</span>
                    </div>
                    <button onClick={() => removeProduct(prov.id, p.id)} className="text-red-400 ml-2 shrink-0"><Trash2 size={11} /></button>
                  </div>
                )
              })}
            </div>

            {/* Agregar producto con SKU y tipo */}
            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-2 space-y-2">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Nuevo producto</p>
              <div className="flex gap-2">
                <input value={np.nombre} onChange={(e) => setNewProd(prev => ({ ...prev, [prov.id]: { ...np, nombre: e.target.value } }))}
                  placeholder="Nombre del producto" onKeyDown={(e) => e.key === 'Enter' && addProduct(prov.id)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                <input value={np.sku} onChange={(e) => setNewProd(prev => ({ ...prev, [prov.id]: { ...np, sku: e.target.value } }))}
                  placeholder="SKU" className="w-20 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
              </div>
              <div className="flex gap-2 items-center">
                <select value={np.tipo} onChange={(e) => setNewProd(prev => ({ ...prev, [prov.id]: { ...np, tipo: e.target.value } }))}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
                  <option value="Ligero">Ligero</option>
                  <option value="Semi-Pesado">Semi-Pesado</option>
                  <option value="Pesado">Pesado</option>
                </select>
                <button onClick={() => addProduct(prov.id)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors">
                  + Agregar
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Panel principal con acordeones ────────────────────────────────────────────
export default function SettingsPanel({ workers, naves, providers, adminCred, onUpdateWorkers, onUpdateNaves, onUpdateProviders, onUpdateAdmin, onImportRecord, frase, setFrase, categorias = [], onAddCategoria, configPuntos, onUpdatePuntosXCaja }) {
  const [openId, setOpenId] = useState(null)
  const [newUser, setNewUser] = useState('')
  const [newPin, setNewPin] = useState('')
  const [msg, setMsg] = useState('')
  const [fraseEdit, setFraseEdit] = useState(frase || '')

  const saveAdmin = () => {
    if (!newUser.trim() && !newPin.trim()) return
    if (newPin && newPin.length < 4) { setMsg('Mínimo 4 caracteres'); return }
    onUpdateAdmin({ username: newUser.trim() || adminCred.username, pin: newPin.trim() || adminCred.pin })
    setNewUser(''); setNewPin('')
    setMsg('✅ Credenciales actualizadas')
    setTimeout(() => setMsg(''), 3000)
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400'

  return (
    <div className="space-y-2 pb-8">

      <Accordion id="naves" openId={openId} setOpenId={setOpenId} icon={Warehouse} title="Naves / Bodegas" badge={naves.length}>
        <NavesList naves={naves} onChange={onUpdateNaves} />
      </Accordion>

      <Accordion id="workers" openId={openId} setOpenId={setOpenId} icon={Users} title="Operadores" badge={workers.length}>
        <WorkersList workers={workers} onChange={onUpdateWorkers} />
      </Accordion>

      <Accordion id="providers" openId={openId} setOpenId={setOpenId} icon={Package} title="Proveedores y Productos" badge={providers.length}>
        <ProviderEditor providers={providers} onChange={onUpdateProviders} />
      </Accordion>

      <Accordion id="categorias" openId={openId} setOpenId={setOpenId} icon={Package} title="Categorías de Producto" badge={categorias.length}>
        <CategoriasEditor categorias={categorias} onAdd={onAddCategoria} />
      </Accordion>

      <Accordion id="puntos" openId={openId} setOpenId={setOpenId} icon={Package} title="Puntos por Tipo de Carga">
        <PuntosEditor configPuntos={configPuntos} onUpdate={onUpdatePuntosXCaja} />
      </Accordion>

      <Accordion id="admin" openId={openId} setOpenId={setOpenId} icon={ShieldCheck} title="Credenciales Admin">
        <p className="text-xs text-slate-500 dark:text-slate-400">Usuario actual: <strong className="text-indigo-600 dark:text-indigo-300">{adminCred.username}</strong></p>
        <input type="text" value={newUser} onChange={(e) => setNewUser(e.target.value)}
          placeholder="Nuevo usuario (vacío = sin cambio)" className={inputCls} />
        <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)}
          placeholder="Nueva contraseña" className={inputCls} />
        <button onClick={saveAdmin}
          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 flex items-center justify-center gap-2 transition-colors">
          <Save size={15} /> Guardar Credenciales
        </button>
        {msg && <p className="text-xs text-center text-indigo-500">{msg}</p>}
      </Accordion>

      <Accordion id="frase" openId={openId} setOpenId={setOpenId} icon={ClipboardList} title="Frase motivacional">
        <p className="text-xs text-slate-500 dark:text-slate-400">Esta frase aparece en la pantalla de login.</p>
        <textarea
          value={fraseEdit}
          onChange={(e) => setFraseEdit(e.target.value)}
          rows={3}
          placeholder="Escribe una frase motivacional..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
        />
        <button
          onClick={() => { setFrase(fraseEdit); }}
          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 flex items-center justify-center gap-2 transition-colors">
          <Save size={15} /> Guardar frase
        </button>
      </Accordion>

      <Accordion id="cache" openId={openId} setOpenId={setOpenId} icon={RefreshCw} title="Mantenimiento">        <p className="text-xs text-slate-500 dark:text-slate-400">Si la app no carga bien o muestra datos desactualizados, limpia el caché.</p>
        <button onClick={async () => {
            try {
              if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())) }
              if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))) }
              localStorage.removeItem('app_version')
            } catch (e) { console.warn(e) }
            window.location.reload()
          }}
          className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2.5 flex items-center justify-center gap-2 transition-colors">
          <RefreshCw size={15} /> Limpiar caché y recargar
        </button>
      </Accordion>

      {onImportRecord && (
        <Accordion id="import" openId={openId} setOpenId={setOpenId} icon={ClipboardList} title="Agregar Registro Histórico">
          <ImportRecord workers={workers} naves={naves} providers={providers} onSave={onImportRecord} />
        </Accordion>
      )}
    </div>
  )
}

// ── Registro histórico con grid-cols-2 ────────────────────────────────────────
function ImportRecord({ workers, naves, providers, onSave }) {
  const toLocal = (d) => { const pad = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
  const now = new Date(), ago = new Date(now - 3600000)

  const [naveId,    setNaveId]    = useState(naves[0]?.id || '')
  const [provider,  setProvider]  = useState(providers[0]?.name || '')
  const [product,   setProduct]   = useState(providers[0]?.products?.[0] || '')
  const [po,        setPo]        = useState('')
  const [tipoCarga, setTipoCarga] = useState('')
  const [startVal,  setStartVal]  = useState(toLocal(ago))
  const [endVal,    setEndVal]    = useState(toLocal(now))
  const [cajasEst,  setCajasEst]  = useState('')
  const [cajasReal, setCajasReal] = useState('')
  const [descarg,   setDescarg]   = useState([])
  const [estib,     setEstib]     = useState([])
  const [saving,    setSaving]    = useState(false)

  const selNave = naves.find(n => n.id === naveId)
  const selProv = providers.find(p => p.name === provider)
  const toggleDescarg = (name) => setDescarg(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name])
  const toggleEstib   = (name) => setEstib(p   => p.includes(name) ? p.filter(x => x !== name) : [...p, name])

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400'
  const labelCls = 'text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block'

  const handleSave = async () => {
    if (!naveId || !provider || !product || !startVal || !endVal) return
    setSaving(true)
    const ok = await onSave({
      naveId, naveName: selNave?.name || naveId, provider, product, po, tipoCarga,
      startTime: new Date(startVal).getTime(), endTime: new Date(endVal).getTime(),
      cajasEstimadas: cajasEst ? Number(cajasEst) : null, cajasReales: cajasReal ? Number(cajasReal) : null,
      workers: [...new Set([...descarg, ...estib])], descargadores: descarg, estibadores: estib,
    })
    setSaving(false)
    if (ok) { setPo(''); setTipoCarga(''); setCajasEst(''); setCajasReal(''); setDescarg([]); setEstib([]) }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">Ingresa descargas pasadas para incluirlas en las métricas.</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nave</label>
          <select value={naveId} onChange={e => setNaveId(e.target.value)} className={inputCls}>
            {naves.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo carga</label>
          <select value={tipoCarga} onChange={e => setTipoCarga(e.target.value)} className={inputCls}>
            <option value="">—</option>
            <option value="Ligero">Ligero</option>
            <option value="Semi pesado">Semi pesado</option>
            <option value="Pesado">Pesado</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Proveedor</label>
          <select value={provider} onChange={e => { setProvider(e.target.value); setProduct(providers.find(p=>p.name===e.target.value)?.products?.[0]||'') }} className={inputCls}>
            {providers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Producto</label>
          <select value={product} onChange={e => setProduct(e.target.value)} className={inputCls}>
            {(selProv?.products || []).map(pr => <option key={pr} value={pr}>{pr}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>PO (opcional)</label>
          <input type="text" value={po} onChange={e => setPo(e.target.value)} placeholder="PO-123" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>🕐 Hora inicio</label>
          <input type="datetime-local" value={startVal} onChange={e => setStartVal(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>🕐 Hora fin</label>
          <input type="datetime-local" value={endVal} onChange={e => setEndVal(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cajas estimadas</label>
          <input type="number" value={cajasEst} onChange={e => setCajasEst(e.target.value)} placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cajas reales</label>
          <input type="number" value={cajasReal} onChange={e => setCajasReal(e.target.value)} placeholder="0" className={inputCls} />
        </div>
      </div>

      {workers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>📥 Descargadores</label>
            <div className="flex flex-wrap gap-1">
              {workers.map(w => (
                <button key={w.id} onClick={() => toggleDescarg(w.name)}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${descarg.includes(w.name) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
                  {w.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>🏗️ Estibadores</label>
            <div className="flex flex-wrap gap-1">
              {workers.map(w => (
                <button key={w.id} onClick={() => toggleEstib(w.name)}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${estib.includes(w.name) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving || !naveId || !provider || !product}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
        <ClipboardList size={15} /> {saving ? 'Guardando...' : 'Guardar Registro Histórico'}
      </button>
    </div>
  )
}

// ── Categorías de producto ────────────────────────────────────────────────────
function CategoriasEditor({ categorias = [], onAdd }) {
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    const v = input.trim()
    if (!v || !onAdd) return
    setSaving(true)
    await onAdd(v)
    setInput('')
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Las categorías aparecen al crear una nueva descarga para clasificar el tipo de producto.
      </p>
      <div className="flex flex-wrap gap-2">
        {categorias.map((c) => (
          <span key={c.id}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700 text-pink-700 dark:text-pink-300">
            {c.nombre}
          </span>
        ))}
        {categorias.length === 0 && (
          <p className="text-xs text-slate-400 italic">Sin categorías aún</p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nueva categoría (ej. Vasos, Unicel...)"
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || saving}
          className="px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Editor de puntos por tipo de carga ───────────────────────────────────────
function PuntosEditor({ configPuntos, onUpdate }) {
  const DEFAULT = { ligero: 1.0, semi_pesado: 2.5, pesado: 4.0 }
  const cfg = configPuntos || DEFAULT
  const [vals, setVals] = useState({
    Ligero:        String(cfg.ligero),
    'Semi pesado': String(cfg.semi_pesado),
    Pesado:        String(cfg.pesado),
  })
  const [saved, setSaved] = useState(null)

  // Sincronizar cuando configPuntos llega desde Supabase después del primer render
  useEffect(() => {
    if (!configPuntos) return
    setVals({
      Ligero:        String(configPuntos.ligero),
      'Semi pesado': String(configPuntos.semi_pesado),
      Pesado:        String(configPuntos.pesado),
    })
  }, [configPuntos?.ligero, configPuntos?.semi_pesado, configPuntos?.pesado])

  const handleSave = async (tipo) => {
    const valor = parseFloat(vals[tipo])
    if (isNaN(valor) || valor <= 0) return
    console.log('PuntosEditor handleSave', tipo, valor)
    await onUpdate?.(tipo, valor)
    setSaved(tipo)
    setTimeout(() => setSaved(null), 2000)
  }

  const colores = { 'Ligero': 'text-blue-600', 'Semi pesado': 'text-amber-600', 'Pesado': 'text-red-600' }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Define cuántos puntos vale cada caja según su categoría de peso. Afecta todos los rankings y gráficas en tiempo real.
      </p>
      {['Ligero', 'Semi pesado', 'Pesado'].map((tipo) => (
        <div key={tipo} className="flex items-center gap-3">
          <span className={`text-sm font-semibold w-24 shrink-0 ${colores[tipo]}`}>{tipo}</span>
          <input
            type="number" min="0.1" step="0.1"
            value={vals[tipo]}
            onChange={(e) => setVals((p) => ({ ...p, [tipo]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave(tipo)}
            onBlur={() => handleSave(tipo)}
            className="w-24 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400 text-center font-bold"
          />
          <span className="text-xs text-slate-400">pts/caja</span>
          {saved === tipo && <span className="text-xs text-green-500 font-semibold">✅ Guardado</span>}
        </div>
      ))}
    </div>
  )
}

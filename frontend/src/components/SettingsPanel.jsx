import React, { useState } from 'react'
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Package, Users, Warehouse, Lock, Eye, EyeOff } from 'lucide-react'

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
        <div key={w.id} className="rounded-xl border border-[#8fa3b1]/20 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm text-[#1a3a8f] dark:text-white">{w.name}</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditId(editId === w.id ? null : w.id); setEditPwd('') }}
                className="text-xs text-[#2563c4] dark:text-[#8fa3b1] underline">
                {editId === w.id ? 'Cancelar' : 'Cambiar pwd'}
              </button>
              <button onClick={() => remove(w.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
          <p className="text-xs text-[#8fa3b1]">Usuario: <span className="font-mono">{w.name}</span></p>

          {editId === w.id && (
            <div className="flex gap-2 mt-2">
              <input type="password" value={editPwd} onChange={(e) => setEditPwd(e.target.value)}
                placeholder="Nueva contraseña"
                className="flex-1 rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1.5 text-xs focus:border-[#1a3a8f] outline-none" />
              <button onClick={() => saveEdit(w.id)}
                className="px-3 rounded-lg bg-[#1a3a8f] text-white text-xs font-bold">
                <Save size={13} />
              </button>
            </div>
          )}
        </div>
      ))}
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
export default function SettingsPanel({ workers, naves, providers, adminCred, onUpdateWorkers, onUpdateNaves, onUpdateProviders, onUpdateAdmin }) {
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
    </div>
  )
}

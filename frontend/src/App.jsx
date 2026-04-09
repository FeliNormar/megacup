import { useState } from 'react'
import { LayoutDashboard, BarChart2, History, PlusCircle, Settings, LogOut, Sun, Moon, Menu, X, RefreshCw } from 'lucide-react'

import { useAppState }     from './hooks/useAppState'
import { useRealtime }     from './hooks/useRealtime'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import LoginScreen         from './components/LoginScreen'
import NaveCard            from './components/NaveCard'
import NewDescarga         from './components/NewDescarga'
import Analytics           from './components/Analytics'
import SettingsPanel       from './components/SettingsPanel'
import ToastContainer      from './components/ToastContainer'
import PageTransition      from './components/PageTransition'
import WorkerPanel         from './components/WorkerPanel'

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Descargas' },
  { id: 'new',       icon: PlusCircle,      label: 'Nueva'     },
  { id: 'analytics', icon: BarChart2,       label: 'Analítica' },
  { id: 'history',   icon: History,         label: 'Historial' },
]

export default function App() {
  const [tab,     setTab]     = useState('dashboard')
  const [showNew, setShowNew] = useState(false)

  const {
    dark, setDark,
    session, setSession, logout,
    workers,
    naves,     setNaves,
    providers, setProviders,
    adminCred,
    almacenCred,
    assignments, setAssignments,
    records,
    recordsPage,
    recordsTotal,
    recordsPageSize,
    fetchRecordsPage,
    visibleAssignments,
    activeNaveIds,
    isAdmin, isAlmacenista, isWorker,
    createDescarga,
    finishDescarga,
    reportIncident,
    updateWorkers,
    updateAdmin,
    softDeleteAssignment,
    softDeleteRecord,
    editAssignment,
    editRecord,
  } = useAppState()

  const online = useOnlineStatus()

  useRealtime({
    session,
    onNewAssignment: (a) => {
      setAssignments((prev) => ({ ...prev, [a.naveId]: a }))
    },
  })

  // ── Pantalla de login ────────────────────────────────────────────────────
  if (!session) {
    return (
      <LoginScreen
        workers={workers}
        adminCred={adminCred}
        almacenCred={almacenCred}
        onLogin={setSession}
      />
    )
  }

  const roleLabel = isAdmin ? 'Administrador' : (isAlmacenista ? 'Almacenista' : `Operador: ${session.workerName}`)

  // ── App principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0d1b3e] flex flex-col">
      <ToastContainer />

      {!online && (
        <div className="bg-yellow-400 text-yellow-900 text-xs font-semibold text-center py-2 px-4 animate-pulse">
          Sin conexión a internet. Algunas funciones no están disponibles.
        </div>
      )}

      <AppHeader
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        onLogout={logout}
        roleLabel={roleLabel}
        online={online}
      />

      <main className="flex-1 overflow-y-auto p-4 pb-24 relative">
        {/* Marca de agua */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 opacity-[0.04] dark:opacity-[0.06]">
          <img src="/logo.png" alt="" className="w-80 select-none" />
        </div>

        <div className="relative z-10">
          <PageTransition tabKey={tab}>
          {tab === 'dashboard' && (
            <Dashboard
              isAdmin={isAdmin}
              isWorker={isWorker}
              isAlmacenista={isAlmacenista}
              naves={naves}
              providers={providers}
              workers={workers}
              visibleAssignments={visibleAssignments}
              onNewDescarga={() => setTab('new')}
              onFinish={finishDescarga}
              onIncident={reportIncident}
              onDelete={softDeleteAssignment}
              onEdit={editAssignment}
              online={online}
            />
          )}

          {tab === 'new' && isAdmin && (
            <NewDescarga
              naves={naves}
              workers={workers}
              providers={providers}
              activeNaveIds={activeNaveIds}
              adminCred={adminCred}
              onSave={(data) => { createDescarga(data); setTab('dashboard') }}
              onClose={() => setTab('dashboard')}
              inline
            />
          )}

          {(tab === 'analytics' || tab === 'history') && (isAdmin || isAlmacenista) && (
            <Analytics
              records={records}
              providers={providers}
              dark={dark}
              isAdmin={isAdmin}
              isAlmacenista={isAlmacenista}
              onDeleteRecord={softDeleteRecord}
              onEditRecord={editRecord}
              naves={naves}
              workers={workers}
              defaultTab={tab === 'history' ? 'history' : 'analytics'}
              recordsPage={recordsPage}
              recordsTotal={recordsTotal}
              recordsPageSize={recordsPageSize}
              fetchRecordsPage={fetchRecordsPage}
            />
          )}

          {tab === 'history' && isWorker && (
            <WorkerPanel records={records} workerName={session.workerName} />
          )}

          {tab === 'settings' && isAdmin && (
            <SettingsPanel
              workers={workers}
              naves={naves}
              providers={providers}
              adminCred={adminCred}
              onUpdateWorkers={updateWorkers}
              onUpdateNaves={setNaves}
              onUpdateProviders={setProviders}
              onUpdateAdmin={updateAdmin}
            />
          )}
          </PageTransition>
        </div>
      </main>

      <BottomNav
        tab={tab}
        onTabChange={setTab}
        isAdmin={isAdmin}
        isAlmacenista={isAlmacenista}
        online={online}
      />

      {/* Menú hamburguesa config — solo admin */}
      {isAdmin && <ConfigMenu
        tab={tab}
        onTabChange={setTab}
        workers={workers}
        naves={naves}
        providers={providers}
        adminCred={adminCred}
        updateWorkers={updateWorkers}
        setNaves={setNaves}
        setProviders={setProviders}
        updateAdmin={updateAdmin}
      />}

      {/* Botón limpiar caché flotante — todos los roles */}
      <ClearCacheButton />
    </div>
  )
}

// ── Sub-componentes de layout ────────────────────────────────────────────────

function AppHeader({ dark, onToggleDark, onLogout, roleLabel, online }) {
  return (
    <header
      className="sticky top-0 z-30 shadow-lg flex items-center justify-between px-4 py-3"
      style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}
    >
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="MEGA CUP" className="h-10 w-auto drop-shadow" />
        <div>
          <p className="font-black text-white text-lg tracking-tight leading-none">MEGA CUP</p>
          <p className="text-blue-200 text-[10px] leading-none">{roleLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Chip online/offline */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold mr-1 ${
          online ? 'bg-green-500/20 text-green-300' : 'bg-yellow-400/20 text-yellow-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
          {online ? 'En línea' : 'Sin conexión'}
        </div>
        <button onClick={onToggleDark} aria-label="Cambiar tema" className="p-2 rounded-full hover:bg-white/10 text-white/80">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button onClick={onLogout} aria-label="Cerrar sesión" className="p-2 rounded-full hover:bg-white/10 text-white/80">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

function Dashboard({ isAdmin, isWorker, isAlmacenista, naves, providers, workers, visibleAssignments, onNewDescarga, onFinish, onIncident, onDelete, onEdit, online }) {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <button
          onClick={onNewDescarga}
          disabled={!online}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-white font-bold text-base shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}
        >
          <PlusCircle size={22} />
          Nueva Descarga
        </button>
      )}

      {visibleAssignments.length === 0 ? (
        <EmptyState isAdmin={isAdmin} isAlmacenista={isAlmacenista} />
      ) : (
        <div className="nave-grid space-y-4 sm:space-y-0">
          {visibleAssignments.map((a) => {
          const nave = naves.find((n) => n.id === a.naveId) || { name: a.naveName || a.naveId }
          return (
            <NaveCard
              key={a.naveId}
              nave={nave}
              assignment={a}
              isWorker={isWorker}
              isAdmin={isAdmin}
              providers={providers}
              workers={workers}
              naves={naves}
              onFinish={(cajasReales) => onFinish(a.naveId, cajasReales)}
              onIncident={(fotoUrl) => onIncident(a.naveId, fotoUrl)}
              onDelete={() => onDelete(a.naveId)}
              onEdit={(changes) => onEdit(a.naveId, changes)}
            />
          )
        })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ isAdmin, isAlmacenista }) {
  return (
    <div className="text-center py-16 text-[#8fa3b1]">
      <div className="text-5xl mb-3">📦</div>
      <p className="text-lg font-semibold">
        {(isAdmin || isAlmacenista) ? 'Sin descargas activas' : 'No tienes descargas asignadas'}
      </p>
      <p className="text-sm mt-1">
        {isAdmin
          ? 'Presiona "Nueva Descarga" para comenzar.'
          : (isAlmacenista ? 'Espera a que el administrador cree una descarga.' : 'El administrador te asignará cuando haya un trailer.')}
      </p>
    </div>
  )
}

function BottomNav({ tab, onTabChange, isAdmin, isAlmacenista, online }) {
  const items = NAV_ITEMS.filter((item) => {
    if (item.id === 'new') return isAdmin
    if (item.id === 'analytics' || item.id === 'history') return isAdmin || isAlmacenista
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#162050] border-t border-[#8fa3b1]/30 flex">
      {items.map(({ id, icon: Icon, label }) => (
        <button key={id} onClick={() => onTabChange(id)}
          disabled={id === 'new' && !online}
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors disabled:opacity-40 ${
            tab === id ? 'text-[#1a3a8f] dark:text-[#8fa3b1]' : 'text-gray-400'
          }`}>
          <Icon size={22} />
          {label}
        </button>
      ))}
    </nav>
  )
}

function ConfigMenu({ tab, onTabChange, workers, naves, providers, adminCred, updateWorkers, setNaves, setProviders, updateAdmin }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}

      {open && (
        <div className="fixed bottom-20 right-4 z-50 bg-white dark:bg-[#162050] rounded-2xl shadow-2xl border border-[#8fa3b1]/20 overflow-hidden w-64 max-h-[70vh] overflow-y-auto">
          <div className="px-4 py-3 border-b border-[#8fa3b1]/20 flex items-center justify-between">
            <span className="font-bold text-sm text-[#1a3a8f] dark:text-white">Configuración</span>
            <button onClick={() => setOpen(false)}><X size={16} className="text-[#8fa3b1]" /></button>
          </div>
          <div className="p-3">
            <SettingsPanel
              workers={workers}
              naves={naves}
              providers={providers}
              adminCred={adminCred}
              onUpdateWorkers={updateWorkers}
              onUpdateNaves={setNaves}
              onUpdateProviders={setProviders}
              onUpdateAdmin={updateAdmin}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-16 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}
      >
        {open ? <X size={20} className="text-white" /> : <Settings size={20} className="text-white" />}
      </button>
    </>
  )
}

function ClearCacheButton() {
  const handleClear = async () => {
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
  }

  return (
    <button
      onClick={handleClear}
      title="Limpiar caché y recargar"
      className="fixed bottom-16 right-20 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-orange-500"
    >
      <RefreshCw size={20} className="text-white" />
    </button>
  )
}

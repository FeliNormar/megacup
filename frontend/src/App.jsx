import { useState } from 'react'
import { LayoutDashboard, BarChart2, History, PlusCircle, Settings, LogOut, Sun, Moon, Menu, X, RefreshCw } from 'lucide-react'

import { useAppState }     from './hooks/useAppState'
import { useRealtime }     from './hooks/useRealtime'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useVersionCheck } from './hooks/useVersionCheck'
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
    importRecord,
    frase, setFrase,
  } = useAppState()

  const online = useOnlineStatus()
  useVersionCheck()

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
        frase={frase}
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
              onImportRecord={importRecord}
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
        activeCount={visibleAssignments.length}
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
        importRecord={importRecord}
        frase={frase}
        setFrase={setFrase}
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
              session={session}
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
      <div className="relative inline-block mb-4">
        <div className="text-7xl animate-bounce">📦</div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/10 dark:bg-white/10 rounded-full blur-sm" />
      </div>
      <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">
        {(isAdmin || isAlmacenista) ? 'Sin descargas activas' : 'No tienes descargas asignadas'}
      </p>
      <p className="text-sm mt-1 max-w-xs mx-auto">
        {isAdmin
          ? 'Presiona "Nueva Descarga" para comenzar.'
          : (isAlmacenista ? 'Espera a que el administrador cree una descarga.' : 'El administrador te asignará cuando haya un trailer.')}
      </p>
    </div>
  )
}

function BottomNav({ tab, onTabChange, isAdmin, isAlmacenista, online, activeCount }) {
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
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors disabled:opacity-40 relative ${
            tab === id ? 'text-[#1a3a8f] dark:text-[#8fa3b1]' : 'text-gray-400'
          }`}>
          <div className="relative">
            <Icon size={22} />
            {id === 'dashboard' && activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          {label}
        </button>
      ))}
    </nav>
  )
}

function ConfigMenu({ tab, onTabChange, workers, naves, providers, adminCred, updateWorkers, setNaves, setProviders, updateAdmin, importRecord, frase, setFrase }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      {/* Panel pantalla completa con slide-up */}
      <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '92vh' }}>
        <div className="bg-white dark:bg-[#0d1b3e] rounded-t-3xl shadow-2xl flex flex-col h-full" style={{ maxHeight: '92vh' }}>
          {/* Handle + Header */}
          <div className="flex flex-col items-center pt-3 pb-2 px-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mb-3" />
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600">
                  <Settings size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-base leading-none">Configuración</p>
                  <p className="text-xs text-slate-400 mt-0.5">Administrador</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <X size={16} className="text-slate-500 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Contenido scrollable */}
          <div className="overflow-y-auto flex-1 p-4 pb-8">
            <SettingsPanel
              workers={workers}
              naves={naves}
              providers={providers}
              adminCred={adminCred}
              onUpdateWorkers={updateWorkers}
              onUpdateNaves={setNaves}
              onUpdateProviders={setProviders}
              onUpdateAdmin={updateAdmin}
              onImportRecord={importRecord}
              frase={frase}
              setFrase={setFrase}
            />
          </div>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90"
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
      className="fixed bottom-20 right-20 z-40 w-8 h-8 rounded-full shadow flex items-center justify-center bg-orange-400/70 hover:bg-orange-500 transition-colors"
    >
      <RefreshCw size={14} className="text-white" />
    </button>
  )
}

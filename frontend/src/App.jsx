import React, { useState } from 'react'
import { LayoutDashboard, BarChart2, Settings, LogOut, Sun, Moon, PlusCircle } from 'lucide-react'

import { useAppState }  from './hooks/useAppState'
import LoginScreen      from './components/LoginScreen'
import NaveCard         from './components/NaveCard'
import NewDescarga      from './components/NewDescarga'
import Analytics        from './components/Analytics'
import SettingsPanel    from './components/SettingsPanel'

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Descargas' },
  { id: 'analytics', icon: BarChart2,       label: 'Analítica', adminOrAlmacen: true },
  { id: 'settings',  icon: Settings,        label: 'Config',    adminOnly: true },
]

export default function App() {
  const [tab,     setTab]     = useState('dashboard')
  const [showNew, setShowNew] = useState(false)

  const {
    dark, setDark,
    session, setSession,
    workers,   setWorkers,
    naves,     setNaves,
    providers, setProviders,
    adminCred, setAdminCred,
    records,
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

  // ── Pantalla de login ────────────────────────────────────────────────────
  if (!session) {
    return (
      <LoginScreen
        workers={workers}
        adminCred={adminCred}
        onLogin={setSession}
      />
    )
  }

  const roleLabel = isAdmin ? 'Administrador' : (isAlmacenista ? 'Almacenista' : `Operador: ${session.workerName}`)

  // ── App principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0d1b3e] flex flex-col">

      <AppHeader
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        onLogout={() => setSession(null)}
        roleLabel={roleLabel}
      />

      <main className="flex-1 overflow-y-auto p-4 pb-24 relative">
        {/* Marca de agua */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 opacity-[0.04] dark:opacity-[0.06]">
          <img src="/logo.png" alt="" className="w-80 select-none" />
        </div>

        <div className="relative z-10">
          {tab === 'dashboard' && (
            <Dashboard
              isAdmin={isAdmin}
              isWorker={isWorker}
              isAlmacenista={isAlmacenista}
              naves={naves}
              providers={providers}
              workers={workers}
              visibleAssignments={visibleAssignments}
              onNewDescarga={() => setShowNew(true)}
              onFinish={finishDescarga}
              onIncident={reportIncident}
              onDelete={softDeleteAssignment}
              onEdit={editAssignment}
            />
          )}

          {tab === 'analytics' && (isAdmin || isAlmacenista) && (
            <Analytics
              records={records}
              providers={providers}
              dark={dark}
              isAdmin={isAdmin}
              onDeleteRecord={softDeleteRecord}
              onEditRecord={editRecord}
              naves={naves}
              workers={workers}
            />
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
        </div>
      </main>

      <BottomNav
        tab={tab}
        onTabChange={setTab}
        isAdmin={isAdmin}
        isAlmacenista={isAlmacenista}
      />

      {showNew && isAdmin && (
        <NewDescarga
          naves={naves}
          workers={workers}
          providers={providers}
          activeNaveIds={activeNaveIds}
          onSave={(data) => { createDescarga(data); setShowNew(false) }}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}

// ── Sub-componentes de layout ────────────────────────────────────────────────

function AppHeader({ dark, onToggleDark, onLogout, roleLabel }) {
  return (
    <header
      className="sticky top-0 z-30 shadow-lg flex items-center justify-between px-4 py-3"
      style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}
    >
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="MEGA CUP" className="h-10 w-auto drop-shadow" />
        <div>
          <p className="font-black text-white text-lg tracking-tight leading-none">MEGA CUP</p>
          <p className="text-blue-200 text-[10px] leading-none">
            {roleLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleDark}
          aria-label="Cambiar tema"
          className="p-2 rounded-full hover:bg-white/10 text-white/80"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={onLogout}
          aria-label="Cerrar sesión"
          className="p-2 rounded-full hover:bg-white/10 text-white/80"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

function Dashboard({ isAdmin, isWorker, isAlmacenista, naves, providers, workers, visibleAssignments, onNewDescarga, onFinish, onIncident, onDelete, onEdit }) {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <button
          onClick={onNewDescarga}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-white font-bold text-base shadow-lg active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}
        >
          <PlusCircle size={22} />
          Nueva Descarga
        </button>
      )}

      {visibleAssignments.length === 0 ? (
        <EmptyState isAdmin={isAdmin} isAlmacenista={isAlmacenista} />
      ) : (
        visibleAssignments.map((a) => {
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
              onFinish={() => onFinish(a.naveId)}
              onIncident={() => onIncident(a.naveId)}
              onDelete={() => onDelete(a.naveId)}
              onEdit={(changes) => onEdit(a.naveId, changes)}
            />
          )
        })
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

function BottomNav({ tab, onTabChange, isAdmin, isAlmacenista }) {
  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin
    if (item.adminOrAlmacen) return isAdmin || isAlmacenista
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#162050] border-t border-[#8fa3b1]/30 flex">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            tab === id
              ? 'text-[#1a3a8f] dark:text-[#8fa3b1]'
              : 'text-gray-400'
          }`}
        >
          <Icon size={22} />
          {label}
        </button>
      ))}
    </nav>
  )
}

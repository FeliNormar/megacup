import React, { useState } from 'react'
import { LayoutDashboard, BarChart2, Settings, LogOut, Sun, Moon, PlusCircle, WifiOff } from 'lucide-react'

import { useAppState }    from './hooks/useAppState'
import { useRealtime }    from './hooks/useRealtime'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import LoginScreen        from './components/LoginScreen'
import NaveCard           from './components/NaveCard'
import NewDescarga        from './components/NewDescarga'
import Analytics          from './components/Analytics'
import SettingsPanel      from './components/SettingsPanel'
import ToastContainer     from './components/ToastContainer'
import PageTransition     from './components/PageTransition'

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
    session, setSession, logout,
    workers,   setWorkers,
    naves,     setNaves,
    providers, setProviders,
    adminCred, setAdminCred,
    assignments, setAssignments,
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
              onNewDescarga={() => setShowNew(true)}
              onFinish={finishDescarga}
              onIncident={reportIncident}
              onDelete={softDeleteAssignment}
              onEdit={editAssignment}
              online={online}
            />
          )}

          {tab === 'analytics' && (isAdmin || isAlmacenista) && (
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
          </PageTransition>
        </div>
      </main>

      <BottomNav
        tab={tab}
        onTabChange={setTab}
        isAdmin={isAdmin}
        isAlmacenista={isAlmacenista}
        onNewDescarga={() => setShowNew(true)}
        online={online}
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

function BottomNav({ tab, onTabChange, isAdmin, isAlmacenista, onNewDescarga, online }) {
  const [menuOpen, setMenuOpen] = useState(false)

  if (isAdmin) {
    return (
      <>
        {/* Overlay */}
        {menuOpen && (
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setMenuOpen(false)} />
        )}

        {/* Menú hamburguesa admin */}
        {menuOpen && (
          <div className="fixed bottom-20 right-4 z-40 bg-white dark:bg-[#162050] rounded-2xl shadow-2xl border border-[#8fa3b1]/20 overflow-hidden w-56">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Descargas activas' },
              { id: 'analytics', icon: BarChart2,       label: 'Analítica' },
              { id: 'settings',  icon: Settings,        label: 'Configuración' },
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => { onTabChange(id); setMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-[#1a3a8f]/10 ${
                  tab === id ? 'text-[#1a3a8f] dark:text-[#8fa3b1] bg-[#1a3a8f]/5' : 'text-slate-700 dark:text-white'
                }`}>
                <Icon size={18} />
                {label}
              </button>
            ))}
            <div className="border-t border-[#8fa3b1]/20" />
            <button
              onClick={() => { onNewDescarga(); setMenuOpen(false) }}
              disabled={!online}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#1a3a8f] dark:text-[#8fa3b1] hover:bg-[#1a3a8f]/10 disabled:opacity-40"
            >
              <PlusCircle size={18} />
              Nueva Descarga
            </button>
          </div>
        )}

        {/* Botón hamburguesa */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#162050] border-t border-[#8fa3b1]/30 flex items-center justify-between px-4 py-2">
          <span className="text-xs text-[#8fa3b1] font-semibold uppercase tracking-wide">Admin</span>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-[#1a3a8f]/10"
          >
            <span className={`block w-6 h-0.5 bg-[#1a3a8f] dark:bg-[#8fa3b1] transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#1a3a8f] dark:bg-[#8fa3b1] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#1a3a8f] dark:bg-[#8fa3b1] transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </nav>
      </>
    )
  }

  // Barra simple para operadores y almacenistas
  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return false
    if (item.adminOrAlmacen) return isAlmacenista
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#162050] border-t border-[#8fa3b1]/30 flex">
      {items.map(({ id, icon: Icon, label }) => (
        <button key={id} onClick={() => onTabChange(id)}
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            tab === id ? 'text-[#1a3a8f] dark:text-[#8fa3b1]' : 'text-gray-400'
          }`}>
          <Icon size={22} />
          {label}
        </button>
      ))}
    </nav>
  )
}

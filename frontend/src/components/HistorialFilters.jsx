import { useState, useMemo, useCallback, useRef } from 'react'
import { Search, X, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react'
import { fmtTime, fmtDuration } from '../utils/time'
import { Trash2, AlertTriangle } from 'lucide-react'
import { exportToExcel, exportToPDF } from '../utils/export'

const PAGE_SIZE = 50

function useDebounce(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

function highlight(text, query) {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function HistorialFilters({ records = [], naves = [], workers = [], providers = [], isAdmin, isAlmacenista, onDelete, onEditCajas }) {
  const [desde,      setDesde]      = useState('')
  const [hasta,      setHasta]      = useState('')
  const [filtWorker, setFiltWorker] = useState('')
  const [filtProv,   setFiltProv]   = useState('')
  const [filtNave,   setFiltNave]   = useState('')
  const [search,     setSearch]     = useState('')
  const [searchVal,  setSearchVal]  = useState('')
  const [page,       setPage]       = useState(1)

  const debouncedSearch = useDebounce((v) => setSearch(v), 300)

  const handleSearch = (v) => {
    setSearchVal(v)
    debouncedSearch(v)
  }

  const clearFilters = () => {
    setDesde(''); setHasta(''); setFiltWorker(''); setFiltProv(''); setFiltNave('')
    setSearch(''); setSearchVal(''); setPage(1)
  }

  const activeFilters = { desde, hasta, operador: filtWorker, proveedor: filtProv, nave: filtNave, search }

  const handleExcelAll = () => exportToExcel(filtered, activeFilters)
  const handlePDFAll   = () => exportToPDF(filtered, activeFilters)

  const canExport = isAdmin || isAlmacenista

  // Filtrado principal
  const filtered = useMemo(() => {
    let res = records.filter((r) => !r.deleted_at)

    if (desde) res = res.filter((r) => r.startTime >= new Date(desde).getTime())
    if (hasta) {
      const h = new Date(hasta); h.setHours(23, 59, 59, 999)
      res = res.filter((r) => r.startTime <= h.getTime())
    }
    if (filtWorker) res = res.filter((r) => r.workers?.includes(filtWorker))
    if (filtProv)   res = res.filter((r) => r.provider === filtProv)
    if (filtNave)   res = res.filter((r) => r.naveId === filtNave || r.naveName === filtNave)

    // Búsqueda en cliente
    if (search) {
      const q = search.toLowerCase()
      res = res.filter((r) =>
        r.po?.toLowerCase().includes(q) ||
        r.product?.toLowerCase().includes(q) ||
        r.provider?.toLowerCase().includes(q) ||
        r.workers?.some((w) => w.toLowerCase().includes(q))
      )
    }
    return res
  }, [records, desde, hasta, filtWorker, filtProv, filtNave, search])

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore   = paginated.length < filtered.length

  const hasFilters = desde || hasta || filtWorker || filtProv || filtNave || search

  return (
    <div className="space-y-3">
      {/* Botones exportar */}
      {canExport && (
        <div className="flex gap-2 justify-end">
          <button onClick={handleExcelAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={handlePDFAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700">
            <FileText size={14} /> PDF
          </button>
        </div>
      )}
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3b1]" />
        <input
          value={searchVal}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por PO, producto, proveedor u operador..."
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-white dark:bg-[#0d1b3e] text-slate-800 dark:text-white pl-9 pr-4 py-2.5 text-sm focus:border-[#1a3a8f] outline-none"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1) }}
          className="rounded-xl border-2 border-[#8fa3b1]/30 bg-white dark:bg-[#0d1b3e] text-slate-800 dark:text-white px-3 py-2 text-xs focus:border-[#1a3a8f] outline-none" />
        <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1) }}
          className="rounded-xl border-2 border-[#8fa3b1]/30 bg-white dark:bg-[#0d1b3e] text-slate-800 dark:text-white px-3 py-2 text-xs focus:border-[#1a3a8f] outline-none" />

        <FilterSelect value={filtWorker} onChange={(v) => { setFiltWorker(v); setPage(1) }} placeholder="Operador">
          {workers.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filtProv} onChange={(v) => { setFiltProv(v); setPage(1) }} placeholder="Proveedor">
          {providers.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filtNave} onChange={(v) => { setFiltNave(v); setPage(1) }} placeholder="Nave">
          {naves.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </FilterSelect>

        {hasFilters && (
          <button onClick={clearFilters}
            className="flex items-center justify-center gap-1 rounded-xl border-2 border-[#8fa3b1]/30 text-[#8fa3b1] text-xs py-2 hover:border-red-400 hover:text-red-400">
            <X size={13} /> Limpiar
          </button>
        )}
      </div>

      {/* Contador */}
      <p className="text-xs text-[#8fa3b1]">
        {filtered.length} {filtered.length === 1 ? 'descarga encontrada' : 'descargas encontradas'}
      </p>

      {/* Lista */}
      {filtered.length === 0
        ? <p className="text-center text-[#8fa3b1] text-sm py-6">Sin resultados</p>
        : <>
            <div className="space-y-2">
              {paginated.map((r) => (
                <HistorialRow key={r.id} record={r} search={search} isAdmin={isAdmin} onDelete={() => onDelete(r.id)} onEditCajas={onEditCajas} workers={workers} />
              ))}
            </div>
            {hasMore && (
              <button onClick={() => setPage((p) => p + 1)}
                className="w-full rounded-xl border-2 border-[#8fa3b1]/30 text-[#8fa3b1] text-sm py-3 hover:border-[#1a3a8f] hover:text-[#1a3a8f] flex items-center justify-center gap-2">
                <ChevronDown size={16} /> Cargar más ({filtered.length - paginated.length} restantes)
              </button>
            )}
          </>
      }
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, children }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border-2 border-[#8fa3b1]/30 bg-white dark:bg-[#0d1b3e] text-slate-800 dark:text-white px-3 py-2 text-xs focus:border-[#1a3a8f] outline-none">
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

function HistorialRow({ record: r, search, isAdmin, onDelete, onEditCajas, workers = [] }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [editCajas,  setEditCajas]  = useState(false)
  const [cajasEst,   setCajasEst]   = useState(r.cajasEstimadas || r.cajas_estimadas || '')
  const [cajasReal,  setCajasReal]  = useState(r.cajasReales    || r.cajas_reales    || '')
  const [descarg,    setDescarg]    = useState(r.descargadores  || [])
  const [estib,      setEstib]      = useState(r.estibadores    || [])

  // Convertir timestamps a formato datetime-local
  const toDatetimeLocal = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const [startVal, setStartVal] = useState(() => toDatetimeLocal(r.startTime))
  const [endVal,   setEndVal]   = useState(() => toDatetimeLocal(r.endTime))

  const toggleDescarg = (name) => setDescarg((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])
  const toggleEstib   = (name) => setEstib((p)   => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])

  const saveCajas = () => {
    const changes = {
      cajasEstimadas: cajasEst  ? Number(cajasEst)  : null,
      cajasReales:    cajasReal ? Number(cajasReal) : null,
      descargadores:  descarg,
      estibadores:    estib,
    }
    if (startVal) changes.startTime = new Date(startVal).getTime()
    if (endVal)   changes.endTime   = new Date(endVal).getTime()
    onEditCajas(r.id, changes)
    setEditCajas(false)
  }
  return (
    <div className="rounded-xl border border-[#8fa3b1]/20 p-3 text-sm bg-white dark:bg-[#162050]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-[#1a3a8f] dark:text-white">{r.naveName || r.naveId}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            r.status === 'finished' ? 'bg-pink-100 text-pink-600' : 'bg-red-100 text-red-600'
          }`}>
            {r.status === 'finished' ? 'Terminado' : 'Incidencia'}
          </span>
          {isAdmin && (
            <button onClick={() => setConfirmDel(true)} className="text-[#8fa3b1] hover:text-red-500">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[#8fa3b1] text-xs">📅 {fmtTime(r.startTime)}</p>
      <p className="text-[#8fa3b1] text-xs">⏱ {fmtDuration(r.endTime - r.startTime)}</p>
      <p className="text-[#8fa3b1] text-xs">🏭 {highlight(r.provider, search)} — {highlight(r.product, search)}</p>
      {r.po && <p className="text-[#8fa3b1] text-xs">PO: {highlight(r.po, search)}</p>}
      {r.workers?.length > 0 && (
        <p className="text-[#8fa3b1] text-xs">👷 {r.workers.map((w, i) => (
          <span key={i}>{i > 0 && ', '}{highlight(w, search)}</span>
        ))}</p>
      )}

      {/* Cajas */}
      {!editCajas ? (
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {(r.cajasEstimadas || r.cajas_estimadas) ? (
            <span className="text-xs text-[#8fa3b1]">Est: <span className="font-semibold text-slate-700 dark:text-white">{r.cajasEstimadas || r.cajas_estimadas}</span></span>
          ) : null}
          {(r.cajasReales || r.cajas_reales) ? (
            <span className="text-xs text-[#8fa3b1]">Real: <span className="font-semibold text-slate-700 dark:text-white">{r.cajasReales || r.cajas_reales}</span></span>
          ) : null}
          {r.descargadores?.length > 0 && (
            <span className="text-xs text-[#8fa3b1]">📥 {r.descargadores.join(', ')}</span>
          )}
          {r.estibadores?.length > 0 && (
            <span className="text-xs text-[#8fa3b1]">🏗️ {r.estibadores.join(', ')}</span>
          )}
          {isAdmin && (
            <button onClick={() => setEditCajas(true)} className="text-xs text-[#2563c4] underline">
              Editar
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2 items-center flex-wrap">
            <input type="number" value={cajasEst} onChange={(e) => setCajasEst(e.target.value)}
              placeholder="Cajas est." className="w-24 rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1 text-xs outline-none focus:border-[#1a3a8f]" />
            <input type="number" value={cajasReal} onChange={(e) => setCajasReal(e.target.value)}
              placeholder="Cajas real" className="w-24 rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1 text-xs outline-none focus:border-[#1a3a8f]" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#8fa3b1] font-semibold">🕐 Hora inicio:</p>
            <input type="datetime-local" value={startVal} onChange={(e) => setStartVal(e.target.value)}
              className="w-full rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1 text-xs outline-none focus:border-[#1a3a8f]" />
            <p className="text-xs text-[#8fa3b1] font-semibold">🕐 Hora fin:</p>
            <input type="datetime-local" value={endVal} onChange={(e) => setEndVal(e.target.value)}
              className="w-full rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1 text-xs outline-none focus:border-[#1a3a8f]" />
          </div>
          {workers.length > 0 && (
            <>
              <p className="text-xs text-[#8fa3b1] font-semibold">📥 Descargadores:</p>
              <div className="flex flex-wrap gap-1">
                {workers.map((w) => (
                  <button key={w.id || w.name} onClick={() => toggleDescarg(w.name)}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                      descarg.includes(w.name) ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white' : 'border-[#8fa3b1]/40 text-[#8fa3b1]'
                    }`}>
                    {w.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#8fa3b1] font-semibold">🏗️ Estibadores:</p>
              <div className="flex flex-wrap gap-1">
                {workers.map((w) => (
                  <button key={w.id || w.name} onClick={() => toggleEstib(w.name)}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                      estib.includes(w.name) ? 'bg-[#2563c4] border-[#2563c4] text-white' : 'border-[#8fa3b1]/40 text-[#8fa3b1]'
                    }`}>
                    {w.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button onClick={saveCajas} className="px-3 py-1 rounded-lg bg-[#1a3a8f] text-white text-xs font-bold">Guardar</button>
            <button onClick={() => setEditCajas(false)} className="text-xs text-[#8fa3b1]">Cancelar</button>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-[#162050] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={22} className="text-red-500 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-white">
                ¿Eliminar descarga de {r.provider} en {r.naveName || r.naveId}? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
              <button onClick={() => { onDelete(); setConfirmDel(false) }} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#dc2626]">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

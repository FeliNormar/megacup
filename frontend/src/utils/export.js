import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/** Formatea timestamp a "DD/MM/YYYY hh:mm AM/PM" */
export function formatDate12h(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

/** Formatea segundos a "1h 30min" o "45 min" */
export function formatDurationSec(ms) {
  if (!ms || ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

/** Genera string descriptivo de filtros activos */
export function getActiveFiltersLabel(filters) {
  const parts = []
  if (filters.desde)      parts.push(`Desde: ${filters.desde}`)
  if (filters.hasta)      parts.push(`Hasta: ${filters.hasta}`)
  if (filters.operador)   parts.push(`Operador: ${filters.operador}`)
  if (filters.proveedor)  parts.push(`Proveedor: ${filters.proveedor}`)
  if (filters.nave)       parts.push(`Nave: ${filters.nave}`)
  if (filters.search)     parts.push(`Búsqueda: "${filters.search}"`)
  return parts.join(' | ')
}

function recordsToRows(records) {
  return records.map((r) => [
    formatDate12h(r.startTime),
    r.naveName || r.naveId || '',
    r.provider  || '',
    r.product   || '',
    r.po        || '',
    (r.workers  || []).join(', '),
    formatDurationSec(r.endTime - r.startTime),
    r.incidencia || '',
  ])
}

const HEADERS = ['Fecha', 'Nave', 'Proveedor', 'Producto', 'PO', 'Operador', 'Duración', 'Incidencia']

/** Exporta a Excel */
export function exportToExcel(records, filters = {}) {
  const rows  = recordsToRows(records)
  const ws    = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])

  // Estilo encabezado — compatible con xlsx-js-style
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })]
    if (cell) {
      cell.s = {
        font:      { bold: true, color: { rgb: 'FFFFFF' } },
        fill:      { fgColor: { rgb: '1A3A8F' } },
        alignment: { horizontal: 'center' },
      }
    }
  }

  // Ancho de columnas
  ws['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 20 }]

  const wb   = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Historial')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `megacup-historial-${today}.xlsx`)
}

/** Exporta a PDF */
export function exportToPDF(records, filters = {}) {
  const doc = new jsPDF({ orientation: 'landscape' })

  const today     = new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  const filterStr = getActiveFiltersLabel(filters)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('MEGA CUP — Historial de Descargas', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${today}`, 14, 23)
  if (filterStr) doc.text(`Filtros: ${filterStr}`, 14, 29)

  const startY = filterStr ? 34 : 28

  autoTable(doc, {
    head:       [HEADERS],
    body:       recordsToRows(records),
    startY,
    styles:     { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [26, 58, 143], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8)
    },
  })

  const today2 = new Date().toISOString().slice(0, 10)
  doc.save(`megacup-historial-${today2}.pdf`)
}

/**
 * Exporta la comparativa de manifiesto vs capturas a Excel.
 * @param {object} assignment - La descarga finalizada
 * @param {array}  comparativa - [{nombre, sku, cantidad_esperada, capturado, diferencia}]
 * @param {array}  capturas    - Log detallado de capturas [{nombre, sku, cantidad, operador, created_at}]
 */
export function exportComparativaExcel(assignment, comparativa, capturas) {
  const wb   = XLSX.utils.book_new()
  const date = formatDate12h(assignment.startTime)

  // ── Hoja 1: Resumen comparativa ──────────────────────────────────────────
  const resumenHeaders = ['Producto', 'SKU', 'Esperado', 'Capturado', 'Diferencia', 'Estado']
  const resumenRows = comparativa.map(item => [
    item.nombre,
    item.sku || '—',
    item.cantidad_esperada,
    item.capturado,
    item.diferencia,
    item.diferencia === 0 ? '✅ OK' : item.diferencia > 0 ? '📦 Sobrante' : '⚠️ Faltante',
  ])

  const wsResumen = XLSX.utils.aoa_to_sheet([
    [`MEGA CUP — Comparativa de Descarga`],
    [`Nave: ${assignment.naveName || assignment.naveId}  |  Proveedor: ${assignment.provider}  |  Fecha: ${date}`],
    [],
    resumenHeaders,
    ...resumenRows,
  ])

  // Estilos encabezado
  wsResumen['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }]
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }]

  XLSX.utils.book_append_sheet(wb, wsResumen, 'Comparativa')

  // ── Hoja 2: Log detallado de capturas ────────────────────────────────────
  if (capturas?.length > 0) {
    const logHeaders = ['Hora', 'Producto', 'SKU', 'Cantidad', 'Operador']
    const logRows = capturas.map(c => [
      formatDate12h(c.created_at ? new Date(c.created_at).getTime() : null),
      c.nombre,
      c.sku || '—',
      c.cantidad,
      c.operador,
    ])
    const wsLog = XLSX.utils.aoa_to_sheet([logHeaders, ...logRows])
    wsLog['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, wsLog, 'Log Capturas')
  }

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `megacup-comparativa-${assignment.naveName || 'nave'}-${today}.xlsx`)
}

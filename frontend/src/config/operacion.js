/**
 * Configuración de días operativos.
 * Edita aquí si cambia el calendario de operación.
 */
export const DIAS_OPERATIVOS = {
  lunes:   { dayIndex: 1, label: 'Lun', activo: true },
  viernes: { dayIndex: 5, label: 'Vie', activo: true },
  sabado:  { dayIndex: 6, label: 'Sáb', activo: true },
}

export const esDiaOperativo = (fechaISO) => {
  const day = new Date(fechaISO).getDay()
  return Object.values(DIAS_OPERATIVOS)
    .filter((d) => d.activo)
    .some((d) => d.dayIndex === day)
}

export const labelDia = (dayIndex) => {
  return Object.values(DIAS_OPERATIVOS).find((d) => d.dayIndex === dayIndex)?.label ?? ''
}

export const diasActivosOrdenados = () =>
  Object.values(DIAS_OPERATIVOS).filter((d) => d.activo).sort((a, b) => a.dayIndex - b.dayIndex)

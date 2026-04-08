/**
 * Configuración de días operativos.
 * Edita aquí si cambia el calendario de operación.
 * dayIndex: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
 */
export const DIAS_OPERATIVOS = {
  lunes:     { dayIndex: 1, label: 'Lun', activo: true },
  martes:    { dayIndex: 2, label: 'Mar', activo: true },
  miercoles: { dayIndex: 3, label: 'Mié', activo: true },
  jueves:    { dayIndex: 4, label: 'Jue', activo: true },
  viernes:   { dayIndex: 5, label: 'Vie', activo: true },
  sabado:    { dayIndex: 6, label: 'Sáb', activo: true },
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

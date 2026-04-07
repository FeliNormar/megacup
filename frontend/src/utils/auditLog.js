import { supabase } from './supabase'

/**
 * Inserta un log de auditoría. No bloquea si falla.
 * @param {string} descargaId
 * @param {string} usuarioNombre
 * @param {'creada'|'finalizada'|'editada'|'incidencia'|'eliminada'} accion
 * @param {string} [detalle]
 */
export async function insertLog(descargaId, usuarioNombre, accion, detalle = '') {
  try {
    await supabase.from('descarga_logs').insert([{
      descarga_id:    descargaId,
      usuario_nombre: usuarioNombre,
      accion,
      detalle,
    }])
  } catch (err) {
    console.error('insertLog error:', err)
  }
}

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 horas

/** Hashea una contraseña en texto plano */
export async function hashPassword(plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS)
}

/** Verifica una contraseña contra su hash */
export async function verifyPassword(plainText, hash) {
  // Si el hash no empieza con $2 es texto plano (legacy) — comparación directa
  if (!hash.startsWith('$2')) return plainText === hash
  return bcrypt.compare(plainText, hash)
}

/** Guarda la sesión en localStorage con expiración */
export function saveSession(user) {
  try {
    localStorage.setItem('megacup_user', JSON.stringify(user))
    localStorage.setItem('megacup_session_exp', String(Date.now() + SESSION_DURATION_MS))
  } catch (_) {}
}

/** Recupera la sesión si no ha expirado. Retorna null si expiró o no existe */
export function loadSession() {
  try {
    const exp = localStorage.getItem('megacup_session_exp')
    if (!exp || Date.now() > Number(exp)) {
      clearSession()
      return null
    }
    const raw = localStorage.getItem('megacup_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Elimina la sesión del localStorage */
export function clearSession() {
  try {
    localStorage.removeItem('megacup_user')
    localStorage.removeItem('megacup_session_exp')
  } catch (_) {}
}

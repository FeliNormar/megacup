/**
 * Helpers para persistencia en localStorage.
 * Maneja errores silenciosamente (modo privado, cuota llena, etc.)
 */

export const ls = {
  /** Lee un valor del localStorage. Devuelve `defaultValue` si no existe o hay error. */
  get: (key, defaultValue) => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : defaultValue
    } catch {
      return defaultValue
    }
  },

  /** Guarda un valor en localStorage como JSON. */
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Silencioso: cuota excedida o modo privado
    }
  },
}

/** Genera un ID único basado en timestamp + random. */
export const uid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

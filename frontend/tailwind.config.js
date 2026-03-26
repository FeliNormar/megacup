/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue:    '#1a3a8f',   // azul marino
          bluemid: '#2563c4',   // azul medio
          silver:  '#8fa3b1',   // gris plateado
          active:  '#16a34a',   // verde activo
          done:    '#ec4899',   // rosa terminado
          red:     '#dc2626',   // rojo incidencia
          dark:    '#0d1b3e',   // fondo oscuro azul marino
          card:    '#162050',   // card oscuro
        }
      }
    }
  },
  plugins: []
}

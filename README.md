# 🏭 Sistema de Gestión de Bodegas

Sistema PWA (Progressive Web App) para el registro y control de descargas de trailers en tiempo real.
Diseñado para uso en bodega: pantallas táctiles, operación rápida y funcionamiento offline.

---

## 🚀 Arranque rápido

### 1. Backend (API + base de datos)

```bash
cd backend
npm install
npm run dev
# API disponible en → http://localhost:3001
```

### 2. Frontend (React PWA)

```bash
cd frontend
npm install
npm run dev
# App disponible en → http://localhost:5173
```

> Para producción: `npm run build` genera la carpeta `dist/` lista para desplegar.

---

## 🔐 Credenciales por defecto

Las credenciales iniciales se configuran en `frontend/src/constants/defaults.js` antes del primer despliegue.
Cámbialas inmediatamente desde **Configuración → Operadores** y **Configuración → Administrador** tras el primer acceso.

> ⚠️ No uses las credenciales por defecto en producción.

---

## 📱 Instalar como PWA en Android

1. Abrir `http://<IP-de-tu-red>:5173` en **Chrome para Android**
2. Tocar el menú (⋮) → **"Agregar a pantalla de inicio"**
3. La app se instala como aplicación nativa sin necesidad de Play Store

---

## 🗂️ Árbol del proyecto

```
bodega-pwa/
│
├── backend/                        # Servidor Node.js + Express
│   ├── server.js                   # API REST: assignments, records, analytics
│   ├── db.json                     # Base de datos JSON (persistencia flat-file)
│   └── package.json
│
├── frontend/                       # Aplicación React + Vite
│   ├── public/
│   │   └── logo.png                # Logo (usado en header y login)
│   │
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useTimer.js         # Hook cronómetro persistente (sobrevive recargas)
│   │   │
│   │   ├── components/
│   │   │   ├── LoginScreen.jsx     # Pantalla de login (Admin / Operador con credenciales)
│   │   │   ├── NaveCard.jsx        # Card de descarga activa con cronómetro y tiempos
│   │   │   ├── NewDescarga.jsx     # Modal para crear nueva descarga (nave+proveedor+producto+personal)
│   │   │   ├── AssignModal.jsx     # Modal de asignación (uso interno)
│   │   │   ├── QRScanner.jsx       # Lector QR con cámara del dispositivo
│   │   │   ├── Analytics.jsx       # Dashboard de analítica con Chart.js
│   │   │   └── SettingsPanel.jsx   # Configuración: naves, operadores, proveedores, admin
│   │   │
│   │   ├── App.jsx                 # Componente raíz: estado global, navegación, lógica principal
│   │   ├── main.jsx                # Entry point React
│   │   └── index.css               # Tailwind base + utilidades custom
│   │
│   ├── index.html                  # HTML base con meta PWA
│   ├── vite.config.js              # Vite + PWA plugin (manifest, service worker, caché)
│   ├── tailwind.config.js          # Paleta de colores
│   ├── postcss.config.js
│   └── package.json
│
└── README.md
```

---

## 🎨 Paleta de colores

| Color          | Hex       | Uso                              |
|----------------|-----------|----------------------------------|
| Azul marino    | `#1a3a8f` | Botones primarios, headers       |
| Azul medio     | `#2563c4` | Acentos, cronómetro activo       |
| Gris plateado  | `#8fa3b1` | Textos secundarios, bordes       |
| Fondo oscuro   | `#0d1b3e` | Modo oscuro, pantalla de login   |
| Card oscuro    | `#162050` | Cards en modo oscuro             |
| Rosa           | `#ec4899` | Estado "Terminado"               |
| Rojo           | `#dc2626` | Estado "Incidencia"              |

---

## 🧩 Arquitectura y flujo

```
[Login]
   │
   ├── Admin  ──→ Ve todas las naves activas
   │              ├── Crea nueva descarga (nave + proveedor + producto + personal)
   │              ├── Finaliza / registra incidencia
   │              └── Accede a Configuración y Analítica
   │
   └── Operador ──→ Ve solo las naves donde está asignado
                    └── Solo visualiza el cronómetro en progreso
```

### Flujo de una descarga

```
1. Admin presiona "Nueva Descarga"
2. Selecciona: Nave → Proveedor → Producto → PO (opcional, o escanea QR) → Personal
3. Confirma → se registra startTime con Date.now() del dispositivo
4. La NaveCard aparece con cronómetro en vivo
5. Admin presiona "Finalizar" → se registra endTime
6. Se calcula: hora inicio → hora fin → duración total
7. El registro pasa al historial de Analítica
```

---

## ⚙️ Funcionalidades principales

### 🔒 Autenticación dual
- **Admin**: usuario + contraseña, acceso total
- **Operador**: usuario (nombre) + contraseña, acceso restringido a sus naves

### ⏱️ Cronómetro persistente
- Usa `requestAnimationFrame` para precisión máxima
- Guarda `startTime` en `localStorage` — si el celular se apaga o Chrome se cierra, al reabrir el cronómetro continúa desde donde quedó
- La hora se toma siempre del **dispositivo que inicia la descarga** (`Date.now()`) para evitar variaciones entre dispositivos

### 📊 Registro de tiempos
Cada descarga finalizada guarda:
- Fecha y hora de inicio (del dispositivo)
- Fecha y hora de fin
- Duración total (ej. `1h 23m 45s`)
- Proveedor, producto, PO, personal asignado

### 📷 Escaneo QR
- Lee QR con la cámara trasera del dispositivo
- Formato JSON: `{ "provider": "Pactiv", "po": "PO-001", "product": "Charolas" }`
- O formato texto: `Pactiv|PO-001`
- Autocompleta proveedor, producto y PO en el modal

### 📈 Analítica
- Gráfica de barras: tiempo promedio por proveedor (mes actual vs mes anterior)
- Ranking de eficiencia por operador

### ⚙️ Configuración (solo admin)
- Agregar / eliminar **naves** con nombre personalizado
- Agregar / eliminar **operadores** con usuario y contraseña
- Agregar / eliminar **proveedores** y sus **productos**
- Cambiar credenciales del administrador

---

## 🗄️ API Backend

| Método | Endpoint            | Descripción                        |
|--------|---------------------|------------------------------------|
| GET    | `/api/assignments`  | Obtener asignaciones activas       |
| POST   | `/api/assignments`  | Crear / actualizar asignación      |
| DELETE | `/api/assignments/:id` | Eliminar asignación             |
| GET    | `/api/records`      | Historial de descargas             |
| POST   | `/api/records`      | Guardar descarga finalizada        |
| GET    | `/api/analytics`    | Registros filtrados por mes        |

---

## 🔮 Mejoras sugeridas a futuro

- [ ] **Migrar a PostgreSQL** — el esquema SQL ya está comentado en `backend/server.js`
- [ ] **Notificaciones push** — alertar al admin cuando una descarga lleva demasiado tiempo
- [ ] **Exportar a Excel/PDF** — reporte mensual de descargas
- [ ] **Modo offline completo** — sincronización en background cuando regrese la conexión
- [ ] **Fotos de incidencia** — adjuntar imagen al registrar una incidencia
- [ ] **Múltiples almacenes** — soporte para más de una bodega/sucursal
- [ ] **Roles adicionales** — supervisor con permisos intermedios

---

## 🛠️ Stack tecnológico

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite 5                   |
| Estilos    | Tailwind CSS 3 (Mobile-First)       |
| Iconos     | Lucide React                        |
| Gráficas   | Chart.js + react-chartjs-2          |
| QR         | html5-qrcode                        |
| PWA        | vite-plugin-pwa + Workbox           |
| Backend    | Node.js + Express                   |
| Base datos | JSON flat-file (→ PostgreSQL futuro)|
| HTTP       | Axios                               |

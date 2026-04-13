# Cómo calcula el sistema — MEGA CUP

Documento técnico que explica cada métrica de productividad.

---

## 1. Cajas por persona

Cuando se finaliza una descarga, las cajas reales se dividen **equitativamente** entre todos los trabajadores que participaron, sin importar si eran descargadores o estibadores.

**Fórmula:**
```
cajas_por_persona = cajas_reales / total_workers
```

Donde `total_workers` es el conjunto único de descargadores + estibadores combinados (sin duplicados).

**Ejemplo:**
- Descarga con 300 cajas reales
- Descargadores: Celso, Eugenio (2 personas)
- Estibadores: Celso, Pablo (2 personas)
- Pool combinado sin duplicados: Celso, Eugenio, Pablo = **3 personas**
- Cajas por persona: `300 / 3 = 100 cajas`

> Si no hay descargadores ni estibadores definidos, se divide entre todos los `workers` del registro.

---

## 2. Puntos por descarga

Cada caja vale más o menos puntos según la categoría de peso de la carga. El administrador puede cambiar estos factores desde Configuración → "Puntos por Tipo de Carga".

**Factores por defecto:**

| Categoría    | Factor |
|--------------|--------|
| Ligero       | ×1.0   |
| Semi pesado  | ×2.5   |
| Pesado       | ×4.0   |

**Fórmula:**
```
puntos = cajas_por_persona × factor_tipo_carga
```

**Ejemplo:**
- Celso descargó 100 cajas de categoría Pesado
- Puntos: `100 × 4.0 = 400 puntos`

**Ejemplo comparativo — mismo tiempo, diferente carga:**

| Equipo  | Cajas | Categoría   | Factor | Puntos |
|---------|-------|-------------|--------|--------|
| Equipo A | 1000 | Ligero      | ×1.0   | 1,000  |
| Equipo B | 3000 | Semi pesado | ×2.5   | 7,500  |
| Equipo C | 4000 | Pesado      | ×4.0   | 16,000 |

Aunque el Equipo A terminó más rápido, el Equipo C generó más puntos porque su carga requería más esfuerzo.

---

## 3. Productividad en tiempo real (descargas activas)

Durante una descarga activa, el sistema calcula la productividad usando `cajas_asignadas` (número que el admin actualiza en tiempo real) y el tiempo transcurrido desde `startTime`.

**Fórmulas:**
```
minutos_transcurridos = (ahora - startTime) / 60,000

cajas_por_hora_total     = (cajas_asignadas / minutos_transcurridos) × 60
cajas_por_hora_x_persona = cajas_por_hora_total / total_personas
puntos_por_hora_x_persona = cajas_por_hora_x_persona × factor_tipo_carga
```

Donde `total_personas = descargadores.length + estibadores.length`.

**Ejemplo:**
- Descarga activa con 150 cajas asignadas
- 30 minutos transcurridos
- 3 personas (2 descargadores + 1 estibador)
- Categoría: Semi pesado (×2.5)

```
cajas/hora total     = (150 / 30) × 60 = 300 cajas/hora
cajas/hora x persona = 300 / 3 = 100 cajas/hora
puntos/hora x persona = 100 × 2.5 = 250 pts/hora
```

El panel se actualiza automáticamente cada 10 segundos.

---

## 4. Ranking del día

El ranking acumula puntos de todas las descargas terminadas del día actual (desde las 00:00 hasta ahora), más las descargas activas en tiempo real.

**Acumulación:**
```
puntos_totales_operador = Σ (cajas_por_persona × factor) de cada descarga del día
```

**Descargas activas** contribuyen al ranking usando `cajas_asignadas` como base, divididas entre el total de personas de esa descarga.

**Orden:** de mayor a menor `puntos_totales`.

**Ejemplo — Celso en un día con 2 descargas:**

| Descarga | Cajas | Categoría   | Factor | Puntos |
|----------|-------|-------------|--------|--------|
| Nave 17  | 120   | Pesado      | ×4.0   | 480    |
| Nave 1   | 80    | Semi pesado | ×2.5   | 200    |
| **Total**|       |             |        | **680**|

---

## 5. Ranking semanal y mensual

Misma lógica que el ranking del día, pero filtrando registros por `startTime` dentro de la semana o mes correspondiente.

**Cajas/hora en el ranking histórico:**
```
cajas_por_hora = cajas_totales / (minutos_totales / 60)
```

Donde `minutos_totales` es la suma de la duración de todas las descargas del operador en el período.

**Ejemplo:**
- Celso tuvo 5 descargas en la semana
- Total cajas: 600
- Total minutos trabajados: 240 min (4 horas)
- Cajas/hora: `600 / (240 / 60) = 600 / 4 = 150 cajas/hora`

El ranking semanal y mensual se ordena por **puntos totales** del período.

---

## 6. Tiempo estimado para terminar

Cuando hay cajas estimadas definidas en la descarga, el sistema proyecta cuánto tiempo falta para terminar basándose en el ritmo actual.

**Fórmula:**
```
minutos_estimados = (cajas_estimadas / cajas_asignadas) × minutos_transcurridos
minutos_restantes = minutos_estimados - minutos_transcurridos
```

**Ejemplo:**
- Cajas estimadas: 400
- Cajas asignadas hasta ahora: 100
- Minutos transcurridos: 20 min

```
minutos_estimados = (400 / 100) × 20 = 80 min en total
minutos_restantes = 80 - 20 = 60 min restantes
```

Si `minutos_restantes ≤ 0`, el sistema muestra "¡ya debería estar listo!".

---

## 7. Notas importantes

### Divisiones exactas (sin redondeo)
Todas las divisiones de cajas se guardan con decimales exactos para que la suma siempre iguale `cajas_reales`. El redondeo solo ocurre al **mostrar** los valores en pantalla.

```
// Correcto — decimal exacto
cajas_por_persona = 300 / 3 = 100.0

// Si fueran 5 personas
cajas_por_persona = 300 / 5 = 60.0

// Si fueran 7 personas
cajas_por_persona = 300 / 7 = 42.857...  ← se guarda así
```

### Comparación de nombres — case-insensitive
Los nombres de operadores se comparan sin distinguir mayúsculas/minúsculas para evitar duplicados por inconsistencias de escritura.

```
"Celso Jose" == "celso jose" == "CELSO JOSE"  ✓ mismo operador
```

### Compatibilidad con registros históricos
El sistema soporta registros guardados en dos formatos de campo:

| Campo nuevo (snake_case) | Campo viejo (camelCase) |
|--------------------------|-------------------------|
| `cajas_reales`           | `cajasReales`           |
| `tipo_carga`             | `tipoCarga`             |
| `cajas_estimadas`        | `cajasEstimadas`        |
| `start_time`             | `startTime`             |
| `end_time`               | `endTime`               |

### Fallback cuando no hay cajas_reales
Si un registro histórico no tiene `cajas_reales` asignadas, el sistema usa `cajas_estimadas` como aproximación para calcular puntos:

```
cajasReales = cajas_reales ?? cajasReales ?? cajas_estimadas ?? cajasEstimadas ?? 0
```

Esto permite que registros antiguos sin cajas reales aparezcan en las gráficas con una estimación.

---

## Resumen de fórmulas

| Métrica                  | Fórmula                                                    |
|--------------------------|------------------------------------------------------------|
| Cajas por persona        | `cajas_reales / (descargadores + estibadores)`             |
| Puntos por descarga      | `cajas_por_persona × factor_tipo_carga`                    |
| Cajas/hora total         | `(cajas_asignadas / minutos) × 60`                         |
| Cajas/hora por persona   | `cajas_hora_total / total_personas`                        |
| Puntos/hora por persona  | `cajas_hora_x_persona × factor`                            |
| Tiempo estimado total    | `(cajas_estimadas / cajas_asignadas) × minutos_transcurridos` |
| Productividad histórica  | `puntos_totales / minutos_totales`                         |

---

*Archivo generado automáticamente — refleja el estado actual del código en `frontend/src/utils/productividad.js`*

# Design Brief — Tracking de Repostajes (`/repostajes`)

> Brief para **Claude Design**. Complementa el [DESIGN_BRIEF.md](../DESIGN_BRIEF.md) general — léelo primero para tokens, tipografía, radios e iconografía del proyecto.

---

## 1. Qué es

Nueva sección de la app Car Maintenance Tracker para registrar repostajes de combustible y visualizar el consumo del vehículo a lo largo del tiempo. Es la función más pedida que falta: el usuario hoy puede registrar un gasto genérico de tipo "combustible", pero no hay cálculo de l/100km, ni gráfica de evolución, ni detección de consumo anómalo.

**Objetivo:** que el usuario sepa de un vistazo cuánto consume su coche, cuánto gasta en combustible, y si algo cambia (consumo subiendo → posible avería).

---

## 2. Usuarios y contexto

- Conductor particular con 1-3 coches. Reposta 2-4 veces al mes.
- Registra el repostaje justo después de echar gasolina (móvil, en la gasolinera) o al llegar a casa (desktop).
- Quiere ver tendencias, no solo datos sueltos.
- El dato se comparte con editor/viewer del vehículo (misma lógica de permisos que el resto de la app).

---

## 3. Flujo principal

```
Dashboard → menú lateral "Repostajes" (icono Fuel) → /repostajes
  ├── Vista principal: KPIs + gráfica + lista de repostajes
  ├── FAB/botón "Añadir repostaje" → formulario modal/sheet
  └── Cada repostaje en la lista es clickable → detalle inline expandible
```

---

## 4. Pantalla principal (`/repostajes`)

### 4.1 Header (igual que resto de páginas)

```
[eyebrow]  Ford Focus 2023 · 1234 ABC
[H1]       Repostajes.
[subtítulo] 7.2 l/100km de media · 142 €/mes
```

Seguir el patrón editorial de las demás páginas: eyebrow mono uppercase con marca+modelo+matrícula, H1 grande con punto final, subtítulo en `--color-graphite`.

### 4.2 KPIs (fila de 3-4 tarjetas)

Usar el componente `KpiCard` existente (ver `/obd2` como referencia). Datos sugeridos:

| KPI | Ejemplo | Icono (lucide) | Color |
|---|---|---|---|
| Consumo medio | 7.2 l/100km | `Gauge` | `--color-ink` |
| Coste por km | 0.11 €/km | `Coins` o `BadgeEuro` | `--color-ink` |
| Gasto este mes | 142 € | `TrendingUp` | `--color-azure` si baja, `--color-caution` si sube |
| Último repostaje | Hace 4 días | `Fuel` | `--color-graphite` |

Subtext debajo del valor principal: comparativa con el mes anterior ("↓ 0.3 vs. mayo" o "↑ 12% vs. mayo").

### 4.3 Gráfica de evolución

- **Tipo:** gráfico de línea (Recharts `LineChart`, ya en el proyecto).
- **Eje X:** fecha de cada repostaje.
- **Eje Y principal:** consumo l/100km (línea sólida `--color-ink`).
- **Eje Y secundario (opcional):** precio/litro (línea punteada `--color-mist`).
- **Rango temporal:** selector de chips tipo píldora: `3M` · `6M` · `1A` · `Todo` (estilo idéntico al filtro de distancia en `/trips`).
- **Tooltip:** al hover, mostrar fecha, litros, coste total, consumo l/100km de ese repostaje.
- Contenedor: `rounded-[28px] border border-silver-mist bg-snow p-6`. Misma estética que las gráficas de OBD2.
- Responsive: en móvil el gráfico ocupa el ancho completo con scroll horizontal si hay muchos puntos.

### 4.4 Lista de repostajes

Tabla/lista cronológica descendente (más reciente arriba). Cada fila:

```
[fecha dd·MM·yy]  [litros L]  [precio/L €]  [total €]  [consumo l/100km]  [gasolinera]
```

- Estilo: filas alternadas con fondo `--color-fog` / `--color-snow`. Bordes `1px solid --color-silver-mist`. Border-radius 16px en la tabla o cards individuales.
- El consumo se muestra solo si el repostaje anterior fue de depósito lleno (si no, mostrar "—" con tooltip explicativo).
- **Semáforo de consumo:** si el consumo de ese repostaje está >15% por encima de la media, chip naranja `--color-caution`. Si está por debajo, chip verde `--color-mint`. Normal: sin chip.
- En móvil: cada repostaje es una card compacta en vez de fila de tabla.
- Swipe to delete en móvil (o icono basura al hover en desktop), con confirmación.

### 4.5 Estado vacío

Si no hay repostajes: componente `EmptyState` existente con icono `Fuel`, título "Sin repostajes", descripción "Registra tu primer repostaje para empezar a ver el consumo de tu coche.", botón CTA "Añadir repostaje".

---

## 5. Formulario "Añadir repostaje"

Modal/sheet (misma mecánica que `MaintenanceForm` o `ExpenseForm`).

### Campos

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Fecha | Date picker | Sí | Default: hoy |
| Kilómetros del cuentakilómetros | Number | Sí | Validar que sea > último repostaje registrado |
| Litros | Number (1 decimal) | Sí | |
| Precio por litro | Number (3 decimales) | Sí | Calcular total automáticamente (litros × precio) |
| Total pagado | Number (2 decimales) | Auto-calculado | Editable por si el usuario prefiere poner el total del ticket directamente (recalcula precio/litro) |
| Depósito lleno | Toggle/checkbox | Sí | Default: sí. Tooltip: "Marca sí si llenaste el depósito. Es necesario para calcular el consumo real." |
| Gasolinera | Text (opcional) | No | Autocompletar con gasolineras anteriores del usuario |
| Notas | Textarea (opcional) | No | |

### Interacción precio ↔ total

- Si el usuario cambia **litros** o **precio/litro** → se recalcula **total**.
- Si el usuario cambia **total** manualmente → se recalcula **precio/litro**.
- Indicar visualmente cuál se está auto-calculando (ej. fondo ligeramente distinto o icono de candado).

### Diseño del formulario

- Usar `FloatingInput` (label flotante) existente en el proyecto.
- Botón guardar: `variant="accent"` (píldora azul).
- Botón cancelar: `variant="secondary"`.
- Al guardar: actualizar automáticamente los km del vehículo si los km del repostaje son mayores que los actuales (mismo patrón que al registrar mantenimiento).

---

## 6. Integración con el Dashboard

Añadir al Dashboard principal una **MetricCard** nueva (o integrar en las existentes):

- **Consumo medio** → "7.2 l/100km" con subtexto "↓ 0.3 vs. mes anterior" o "Sin datos" si no hay repostajes.
- Click en la card → navega a `/repostajes`.

---

## 7. Integración con Coste total (`/coste`)

La página `/coste` (CostOverviewPage) ya agrega gastos de mantenimiento, seguro y préstamo. Los repostajes deben sumarse como categoría propia en:

- El donut de distribución de costes (nueva porción "Combustible").
- La tabla de resumen anual.

---

## 8. Tokens de diseño a usar

Todos del [DESIGN_BRIEF.md](../DESIGN_BRIEF.md) general:

- **Fondo de página:** `--color-bg` / `--color-fog`
- **Tarjetas/secciones:** `bg-snow border border-silver-mist rounded-[28px] p-7`
- **Texto principal:** `--color-ink`, **secundario:** `--color-graphite`, **terciario:** `--color-mist`
- **Acento (CTA, links):** `--color-azure`
- **Semántico OK:** `--color-mint` · **Aviso:** `--color-caution`
- **Tipografía:** H1 display, body text, mono para datos numéricos/tabular
- **Iconos:** lucide-react, stroke 1.5–1.8, tamaño 16–24px
- **Radios:** botones/inputs 999px (píldora), tarjetas 20–28px, chips 999px
- **Sombras:** preferir borde 1px sobre sombra. Si sombra: `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)`
- **Movimiento:** transiciones 150–250ms ease-out
- **Tema oscuro:** diseñar light y dark. Usar tokens, no hex literales.

---

## 9. Componentes existentes a reutilizar

| Componente | Ubicación | Para qué |
|---|---|---|
| `KpiCard` | `src/components/ui/KpiCard.tsx` | Tarjetas de métricas arriba |
| `FloatingInput` | `src/components/ui/FloatingInput.tsx` | Campos del formulario |
| `Button` | `src/components/ui/Button.tsx` | Botones accent/secondary/danger |
| `Modal` | `src/components/ui/Modal.tsx` | Contenedor del formulario |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | Estado sin repostajes |
| `SkeletonCard` | `src/components/ui/Skeleton.tsx` | Loading state |
| Recharts (`LineChart`) | Ya en dependencias | Gráfica de evolución |

---

## 10. Pantallas a diseñar

1. **Desktop — vista principal** con KPIs + gráfica + lista (con datos)
2. **Desktop — estado vacío** (sin repostajes)
3. **Desktop — formulario modal** de nuevo repostaje
4. **Móvil — vista principal** (cards en vez de tabla)
5. **Móvil — formulario** (sheet bottom)
6. **Tema oscuro** de la vista principal (desktop o móvil)
7. **Card del Dashboard** con el KPI de consumo integrado

---

## 11. Referencia visual

Páginas existentes de la app con estética similar a la que debería tener `/repostajes`:

- `/obd2` — KPIs con GaugeBar + gráfica temporal (la más cercana en concepto)
- `/expenses` — Lista de gastos + gráfico de pastel
- `/insurance` — Layout con anillo + datos tabulares
- `/coste` — Donut + tabla resumen (donde se integrará el combustible)

El diseño debe sentirse como "una página más" de la app — mismo lenguaje visual, no un módulo extraño.

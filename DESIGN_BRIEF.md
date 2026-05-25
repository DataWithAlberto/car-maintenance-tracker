# Design Brief — Car Maintenance Tracker (CMT)

> Documento maestro para pasar a **Claude Design**, **Open Design** o cualquier otra herramienta de diseño UI/UX.
> Contiene todo lo necesario para diseñar pantallas, componentes y flujos de la app sin tener que abrir el código.

---

## 1. Resumen del producto

**Nombre:** Car Maintenance Tracker (CMT)
**Idioma de interfaz:** Español (España)
**Tipo:** Web app responsive (móvil-first), instalable como PWA en el roadmap.
**Tagline:** _La vida de tu coche, en un solo sitio._

**Qué es:**
App multiusuario para llevar el mantenimiento, gastos, documentos, seguros, viajes y datos en tiempo real (OBD2) de uno o varios coches. Incluye una visualización 3D interactiva del coche en la que se puede hacer clic sobre cada pieza para registrar/consultar su mantenimiento.

**Para quién:**

- Conductor particular que quiere tener su coche bajo control (frecuencia de cambios de aceite, ITV, seguro, gastos, etc.).
- Parejas/familias que comparten coche (rol owner / editor / viewer).
- Usuarios entusiastas que conectan un OBD2 vía Bluetooth para ver datos en vivo.
- Talleres que reciben un enlace temporal (`/taller/:token`) para consultar el historial sin necesidad de cuenta.

**No es:**

- Un ERP para flotas.
- Un marketplace de talleres.
- Una red social de coches.

---

## 2. Personalidad de marca

| Atributo                     | Cómo se traduce visualmente                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Premium pero accesible**   | Inspiración Apple/Linear: blancos amplios, tipografía limpia, sin saturar.                            |
| **Confiable**                | Estados claros (ok / atención / vencido), nunca alarmista sin motivo.                                 |
| **Cálido, no frío**          | Permite emoción: hay un módulo de "Viajes" con álbumes y modo sorpresa. La app no es solo utilitaria. |
| **Mecánico, pero sin grasa** | El coche es protagonista (3D, fotos reales), no iconitos de llave inglesa por todas partes.           |

Tono de copy: directo, cercano, en español neutro. Sin exclamaciones innecesarias. "Tu coche", no "el vehículo del usuario".

---

## 3. Sistema visual (tokens reales del proyecto)

### Colores

Tokens CSS definidos en `src/index.css`. Usar siempre el token, nunca el hex literal.

**Neutros (base de toda la UI):**
| Token | Hex | Uso |
|---|---|---|
| `--color-snow` | `#ffffff` | Fondo de tarjetas, modales, superficies elevadas |
| `--color-fog` / `--color-bg` | `#f5f5f7` | Fondo de página |
| `--color-silver-mist` / `--color-border` | `#e8e8ed` | Bordes de 1px, separadores |
| `--color-mist` | `#a1a1a6` | Texto secundario, iconos inactivos |
| `--color-graphite` | `#707070` | Texto terciario |
| `--color-slate` | `#474747` | Texto secundario fuerte |
| `--color-ash` | `#333333` | Texto primario sobre fondos claros |
| `--color-ink` | `#1d1d1f` | Texto principal, titulares |
| `--color-obsidian` | `#000000` | Solo reservado (logos, contraste extremo) |

**Acentos:**
| Token | Hex | Uso |
|---|---|---|
| `--color-azure` / `--color-sky-blueprint` | `#0071e3` | CTA primario, links activos, "el azul" de la marca |
| `--color-cobalt-link` / `--color-sky-dark` | `#0066cc` | Hover/pressed del azul |
| `--color-sky-light` | `#a8d3fb` | Fondos suaves de selección |

**Semánticos:**
| Token | Hex | Uso |
|---|---|---|
| `--color-mint` | `#1cb05c` | Éxito, estado OK, "todo al día" |
| `--color-caution` / `--color-ember` / `--color-sunset-orange` | `#b64400` | Aviso, próximo a vencer, alerta no crítica |
| `--color-sunset-light` | `#d4752e` | Variante secundaria del aviso |

**Acabados/decorativos:** `--color-citrus-finish` `#dddc8c`, `--color-blush-finish` `#e8d0d0`, `--color-indigo-finish` `#596680`, `--color-silver-finish` `#e3e4e5`. Para chips/tags suaves o variantes de tarjeta.

**Tema oscuro:** existe (`data-theme="dark"` en `<html>`). Los componentes deben usar tokens, no hex, para responder al theme switch.

### Tipografía

- **Display / títulos:** `--font-display` (familia SF Pro Display fallback).
- **Texto:** `--font-sans` (SF Pro Text fallback).
- **Mono / datos técnicos (OBD2):** `--font-mono` — `'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace`.
- **Decorativa (excepcional, p.ej. hero de "viajes"):** `--font-times` (serif) o `--font-simeiz`.

Jerarquía sugerida (móvil → desktop):

- H1: 28 / 34 px, semibold, tracking ligero negativo
- H2: 22 / 26 px, semibold
- H3: 18 / 20 px, medium
- Body: 15 / 16 px, regular
- Caption: 12 / 13 px, medium, color `--color-mist`

### Radios y formas

Los radios son **muy redondeados**, casi de "píldora", siguiendo el lenguaje del proyecto:

- `--radius-button` = `999px` (botones siempre píldora)
- `--radius-input` = `999px` (inputs píldora)
- Tarjetas: 20–24 px
- Sheets/modales móviles: 28 px top
- Tags/chips: 999px

### Espaciado

Escala basada en 4 px. Padding habitual de página: `px-6 sm:px-10 py-10`. Gaps de grid: 16 / 24 / 32 px.

### Sombras

Minimalistas. Apple-like. Preferir `1px solid var(--color-border)` antes que sombra. Cuando se usa sombra: `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)`.

### Iconografía

- Librería: **lucide-react** (ya instalada). No mezclar con otros sets.
- Stroke 1.5–2 px, redondeado.
- Tamaño común: 16 / 20 / 24 px.

### Movimiento

- Transiciones cortas (150–250 ms), `ease-out`.
- 3D del coche: rotación suave, sin parallax agresivo.
- Skeletons en vez de spinners siempre que sea posible (`SkeletonCard` ya existe).

---

## 4. Mapa de la app (todas las pantallas)

Estructura de rutas real (`src/App.tsx`).

### Públicas (sin login)

- `/login` — Email + contraseña.
- `/register` — Alta de cuenta.
- `/invite/:token` — Aceptar/rechazar invitación a un coche compartido.
- `/taller/:token` — Vista de solo lectura para talleres (sin cuenta).
- `/viajes/surprise/:token` — Revelado tipo "sorpresa" de un viaje compartido.

### Autenticadas (dentro de `Layout`)

1. **`/dashboard`** — Hub principal: tarjetas de cada coche, alertas activas, próximos servicios, gasto del mes.
2. **`/car`** — Visualización 3D del coche con piezas clickeables. Overlay con info de cada pieza + CTA "Registrar mantenimiento".
3. **`/maintenance`** — Historial de mantenimientos. Filtros por tipo, coche, fecha.
4. **`/maintenance-plan`** — Plan/calendario de futuros mantenimientos (proyectados a partir de km/tiempo).
5. **`/expenses`** — Gastos por categoría con gráfico de pastel (Recharts).
6. **`/documents`** — Documentos del coche (PDF, fotos de facturas). Alertas de vencimiento.
7. **`/insurance`** — Pólizas activas, cobertura, contacto, próximo pago.
8. **`/trips`** — Viajes hechos y planificados. Pestañas: **Viajes**, **Planificación**, **Álbumes** (galería). Toggle privacidad público/privado (los viajes privados se ocultan a usuarios con acceso compartido).
9. **`/mechanics`** y **`/mechanics/detail`** — Talleres guardados, historial por taller, contacto.
10. **`/obd2`** — Conexión Bluetooth a un dongle OBD2. Lectura en vivo de RPM, velocidad, temperatura, códigos DTC. Tipografía monoespaciada.
11. **`/galeria`** — Fotos del coche y de viajes, unificadas. Pestaña «Álbumes».
12. **`/sharing`** — Gestionar quién tiene acceso al coche (owner/editor/viewer). Invitar por email.
13. **`/settings`** — Perfil, tema (claro/oscuro), API key de Claude del usuario (modelo "trae tu propia key", se queda en cliente), preferencias.

### Layout global

- Barra de navegación lateral en desktop, bottom-nav o drawer en móvil.
- Selector de coche activo (si el usuario tiene varios).
- Toaster top-right (`react-hot-toast`) con estilo: fondo `--color-snow`, borde `1px var(--color-silver-mist)`, radio 20px, sin sombra.

---

## 5. Componentes que necesitan diseño (prioridad)

### Críticos (P0)

1. **Tarjeta de coche** (en Dashboard): foto/3D mini, nombre, matrícula, km actuales, próxima alerta.
2. **Tarjeta de alerta**: cambio de aceite, ITV, seguro, etc. con severidad (ok / atención / vencido).
3. **Overlay 3D del coche**: panel lateral o sheet que aparece al clicar una pieza. Información + CTA.
4. **Formulario de mantenimiento**: tipo, fecha, km, coste, taller, notas, adjuntos.
5. **Bottom-nav móvil** y **sidebar desktop** del `Layout`.
6. **Selector de coche activo** (si hay varios).

### Importantes (P1)

7. **Línea de tiempo de mantenimientos** (timeline vertical en `/maintenance`).
8. **Tarjeta de viaje** con foto, ruta y privacidad pública/privada.
9. **Card de pieza/álbum** en galería.
10. **Lectura en vivo OBD2**: gauges + lista de DTC. Tipografía mono.
11. **Form de gasto** con categoría visual.
12. **Vista de taller (`/taller/:token`)**: layout limpio, sin nav lateral, sólo lectura, optimizada para tablet del mecánico.

### Buenos de tener (P2)

13. **Estado vacío** de cada sección (sin coche, sin gastos, sin viajes…).
14. **Skeletons** específicos por pantalla (ahora se usa un `SkeletonCard` genérico).
15. **Pantalla de revelado de sorpresa** (`/viajes/surprise/:token`) — momento "wow", animación.

---

## 6. Flujos clave (user journeys)

### Flujo 1 — Onboarding

`/register` → confirmación → `/dashboard` vacío con CTA grande **"Añadir tu primer coche"** → modal/sheet con marca, modelo, año, matrícula, km → coche creado → `/car` con 3D.

### Flujo 2 — Registrar un mantenimiento desde el 3D

`/car` → usuario rota el coche → click en una pieza (p.ej. neumático) → overlay con "Última revisión: hace 8 meses · 12.000 km" + botón **"Registrar"** → formulario pre-rellenado con tipo y pieza → guardar → toast "Mantenimiento registrado" → vuelve al 3D con la pieza marcada en verde.

### Flujo 3 — Compartir el coche

`/sharing` → "Invitar" → email + rol (owner/editor/viewer) → se envía enlace `/invite/:token` → la otra persona acepta → ve el coche en su `/dashboard`. Los viajes marcados como privados no aparecen para roles distintos del owner.

### Flujo 4 — Llevar el coche al taller

Desde `/mechanics` → "Generar enlace para taller" → URL `/taller/:token` con caducidad → el mecánico la abre en su tablet, ve historial completo en modo lectura, sin login.

### Flujo 5 — Conectar OBD2

`/obd2` → "Conectar dongle" → diálogo nativo de Web Bluetooth → emparejamiento → dashboards de RPM, velocidad, temperatura → si hay DTC, lista de códigos con descripción + botón "Buscar en Google".

### Flujo 6 — Modo sorpresa de viaje

Owner crea un viaje con flag _sorpresa_ → genera enlace `/viajes/surprise/:token` → al abrirlo, animación de revelado con foto destino + fecha + plan. Pensado para regalar un viaje a una pareja.

---

## 7. Reglas de diseño no negociables

1. **El 3D del coche no se sustituye por iconos**. Si no carga el `.glb`, mostrar un fallback explícito con foto de referencia, nunca cajas o primitivas. (Regla heredada del código.)
2. **Todo debe funcionar en móvil**. Diseñar primero el móvil. Sidebar desktop es un _progressive enhancement_.
3. **Estados de carga visibles**. Skeletons, no spinners. Cada pantalla tiene su propio skeleton.
4. **Estados de error humanos**. "No hemos podido cargar tus coches. Reintentar." No "Error 500".
5. **Estados vacíos siempre ilustrados**. Un dibujo simple + texto + CTA. Nunca dejar un grid vacío.
6. **Privacidad visible**. El toggle público/privado de viajes está arriba del todo de cada pestaña, no escondido en un menú.
7. **Accesibilidad**: `aria-pressed`, `aria-label`, contraste mínimo AA, foco visible (anillo azul).
8. **No usar emojis en producción** salvo en módulos emocionales (Viajes/Sorpresa) y solo si el usuario los introduce.
9. **Tokens, no hex**. Si haces un mockup con color custom, déjalo claro y proponemos un token nuevo.

---

## 8. Restricciones técnicas que afectan al diseño

- **Stack:** React 19 + Vite + TypeScript + Tailwind v4 + Zustand. **lucide-react** para iconos. **Recharts** para gráficos. **react-map-gl + mapbox-gl** y **leaflet** para mapas. **@react-three/fiber** + **drei** para el 3D.
- **Backend:** Supabase (Auth + Postgres + Storage). RLS aplicada — un viewer no puede ver botones de borrar.
- **Sin push notifications todavía** (en roadmap PWA). Las alertas se ven dentro de la app.
- **Mapas:** las pantallas de viajes y talleres usan mapa. Diseñar tiles claros (Mapbox light) por defecto y oscuros si tema dark.
- **OBD2:** Web Bluetooth → solo Chrome/Edge desktop y Android. iOS no soporta — diseñar mensaje claro de "Disponible en Chrome y Android".
- **Tema oscuro:** ya implementado vía `data-theme`. Cualquier diseño debe entregarse en _light_ y _dark_.

---

## 9. Inspiración / referencias

- **Apple.com** y **iCloud.com** — para limpieza, blancos, tipografía y radios píldora.
- **Linear** — para densidad de información, tablas, atajos.
- **Things 3** — para listas con jerarquía suave y vacíos amables.
- **Porsche My Garage / BMW Connected** — para tratamiento del coche como protagonista visual.
- **Airbnb Trips** — para la pestaña "Viajes" y el modo álbum.

Anti-referencias:

- Dashboards estilo Carfax / autoescuela: feos, densos, llenos de iconos genéricos.
- Apps tipo "Auto Care" del Play Store: paleta verde fosforita + sombras de 2010. Evitar.

---

## 10. Lo que necesito que entreguéis (los diseñadores)

Para cada pantalla o componente solicitado:

1. **Pantalla en light + dark**, 390 px ancho (móvil) y 1440 px (desktop).
2. **Estados**: vacío, cargando (skeleton), con datos, error.
3. **Tokens usados** anotados (`--color-azure`, `--radius-button`, etc.). Si proponéis un token nuevo, indicarlo.
4. **Iconos**: indicar nombre exacto de lucide-react (`Wrench`, `Gauge`, `CarFront`, …).
5. **Componentes Tailwind v4 friendly**: clases utilitarias, no `@apply` salvo cuando ya esté en la base.
6. **Notas de interacción**: hover, focus, pressed, transición.
7. **Notas de accesibilidad**: contraste, foco, aria-labels propuestas.

Formato preferido: Figma con frames nombrados igual que la ruta (`/dashboard`, `/car`, `/trips`…) + un archivo `tokens.md` si proponéis cambios al sistema.

---

## 11. Glosario rápido

- **Coche / vehículo:** la entidad principal. Un usuario puede tener varios.
- **Mantenimiento:** un registro de algo hecho al coche (aceite, frenos, ITV…).
- **Plan de mantenimiento:** proyección futura calculada a partir de km/tiempo.
- **Alerta:** un mantenimiento o documento próximo a vencer / vencido.
- **Owner / Editor / Viewer:** roles de acceso compartido.
- **DTC:** Diagnostic Trouble Code, el código de error del OBD2.
- **Surprise / sorpresa:** modo de revelado de un viaje planificado en secreto.
- **Taller link:** URL temporal sin login para que un mecánico vea el historial.

---

## 12. Contacto / iteración

- Repositorio: `https://github.com/DataWithAlberto/car-maintenance-tracker`
- Stack visual ya en código: `src/index.css` (tokens) y `src/components/ui/` (primitivas).
- Idioma de copy: **español de España**.
- Cualquier propuesta que rompa un token o un radio existente, justificadla en una nota.

> **Regla de oro:** si dudáis entre "más bonito" y "más Apple-like, más limpio, más blanco", elegid lo segundo. El protagonista visual es el coche, no la UI.

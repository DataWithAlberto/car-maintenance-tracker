# Car Maintenance Tracker (CMT)

App multiusuario para gestionar el mantenimiento del coche con visualización 3D interactiva.

**Stack:** React 18 + Vite + TypeScript + Three.js (R3F) + Tailwind v4 + Zustand · Node.js + Express + Supabase (Auth + Postgres + Storage)

## Estructura

```
car-maintenance-tracker/
├── src/                         # Frontend React
├── server/                      # Backend Express
└── supabase/setup_complete.sql  # Esquema + RLS + funciones
```

## Setup

### 1. Supabase

1. Crea proyecto en [supabase.com](https://supabase.com)
2. SQL Editor → pega el contenido de `supabase/setup_complete.sql` y ejecuta
3. Storage → crea bucket público `car-maintenance`
4. Auth → activa email + password (desactiva confirmación de email para desarrollo)
5. Project Settings → API → copia `URL`, `anon key` y `service_role key`

### 2. Frontend

```bash
cp .env.example .env.local
# Edita .env.local con SUPABASE_URL y SUPABASE_ANON_KEY
npm install
npm run dev   # http://localhost:5173
```

### 3. Backend (opcional — la app funciona sin él, todo va vía Supabase)

```bash
cd server
cp .env.example .env
# Edita .env con SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev   # http://localhost:3001
```

El backend Express expone una API REST espejo (`/api/vehicles`, `/api/maintenance`, etc.) si prefieres centralizar lógica del lado del servidor. La app frontend usa Supabase JS directamente, así que el backend es opcional para el MVP.

## Features MVP

- ✅ Auth (register/login/logout) vía Supabase Auth
- ✅ CRUD vehículos (multi-vehículo por usuario)
- ✅ Visualización 3D del coche (R3F) con partes clickeables
- ✅ Overlay de información por pieza con CTA de mantenimiento
- ✅ CRUD mantenimiento + cálculo automático de próximo servicio
- ✅ Sistema de alertas (cambio de aceite, revisiones vencidas)
- ✅ CRUD gastos + gráfico de pastel por categoría (Recharts)
- ✅ CRUD documentos con upload a Supabase Storage + alertas vencimiento
- ✅ Compartir acceso (owner / editor / viewer) por email
- ✅ Aceptar/rechazar invitaciones
- ✅ Responsive mobile-friendly + tema dark

## Flujos clave

**Crear vehículo:** Dashboard → "Añadir vehículo" → form (Ford Focus 2023) → seleccionar coche → CarPage 3D

**Añadir mantenimiento desde el 3D:** CarPage → click en pieza (neumático, motor…) → Overlay → "Cambio de aceite" → form pre-rellenado → guardar

**Compartir con la novia:** Sharing → Invitar por email + rol "editor" → ella acepta desde su panel → ve el vehículo en su Dashboard

## Arquitectura

- **Auth:** Supabase Auth → JWT en localStorage → cliente Supabase usa el token automáticamente para RLS
- **Permisos:** Row Level Security en Postgres (ver `supabase/setup_complete.sql`). Owner ve y modifica todo. Editor lee y escribe registros pero no borra el vehículo. Viewer solo lee.
- **Storage:** bucket `car-maintenance` para documentos (PDF, imágenes de facturas).
- **3D:** componente `CarBody` procedural en R3F. En v2 sustituir por GLTF real (carga con `useGLTF` de drei).

## Comandos

| Comando | Acción |
|---------|--------|
| `npm run dev` | Frontend dev server |
| `npm run build` | Build de producción |
| `cd server && npm run dev` | Backend con hot reload |
| `cd server && npm run typecheck` | Type check backend |

## Despliegue

- **Frontend:** Vercel / Netlify. Setea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- **Backend:** Railway / Fly.io / Render. Setea las 3 vars de Supabase + `CORS_ORIGIN`.
- **DB + Storage + Auth:** Supabase Cloud.

## Modelo 3D del vehículo

El visor 3D del Dashboard y la página `/car` cargan modelos `.glb` desde
`public/models/`. Hay dos archivos esperados, en orden de preferencia:

| Archivo | Uso |
|---|---|
| `public/models/ford-focus-st-line-2023.glb` | Modelo profesional definitivo (Mk4.5 ST-Line, plata metalizado). **No incluido** — añadir manualmente. |
| `public/models/ford_focus.glb` | Modelo genérico Sketchfab. Ya incluido. Mantiene la click-detection sobre piezas operativa hasta que se añada el definitivo. |

Si ninguno de los dos existe (o ambos fallan), el visor muestra un fallback
elegante en DOM con foto de referencia y la ruta exacta donde colocar el
archivo. **No se renderiza ninguna maqueta de primitivas como sustituto.**

### Añadir el modelo profesional

1. Obtener o exportar el `.glb` del Ford Focus Mk4.5 ST-Line 2023 (hatchback
   5 puertas, plata metalizado, llantas oscuras, paragolpes ST-Line, pilotos
   traseros rojos, doble escape derecho si lo lleva).
2. Optimizar antes de subir — recomendado mantener por debajo de 5–8 MB:
   ```bash
   npx gltf-transform optimize entrada.glb \
     public/models/ford-focus-st-line-2023.glb \
     --compress draco --texture-compress webp
   ```
3. `useGLTF` de drei activa el decoder Draco automáticamente. No requiere
   configuración adicional.
4. Verificar visualmente que coincide con las imágenes de referencia
   (parrilla negra, faros finos, llantas oscuras, cristales tintados,
   spoiler trasero, difusor negro). El visor solo presenta el modelo; toda
   la fidelidad la aporta el `.glb`.

## Mejoras aplicadas en esta iteración

**FASE 1 — Rápidas y seguras**
- `.env.example` creado con vars Supabase + Anthropic
- `console.error` de los componentes 3D gateados con `import.meta.env.DEV`
- Filtros de `MaintenancePage` con `aria-pressed` + `aria-label`
- ESLint config: ignora `server/`, permite `_` prefix en unused vars,
  `react-hooks/set-state-in-effect` como warning (patrones legítimos de
  guard/init)

**FASE 2 — Visuales medias**
- Code-splitting por ruta: todas las páginas salvo `Dashboard`, `Login` y
  `Register` se cargan vía `React.lazy()`. Bundle inicial reducido — Recharts
  (Expenses 354 KB) y Leaflet (148 KB) ya no están en el chunk principal.
- `<Suspense>` con `SkeletonCard` como fallback de página.

**FASE 3 — Funcionales**
- `src/utils/withRetry.ts`: helper de reintentos con backoff exponencial
  para envolver llamadas de red críticas (Supabase, fetch externos). No
  reintenta errores 4xx por defecto.

**FASE 4 — Integración 3D profesional**
- `FordFocusModel3D` ya estaba implementado en el repo y cumple la regla
  estricta: nunca renderiza primitivas como solución final, solo modelos
  `.glb` reales o un fallback explicativo en DOM.
- `CarViewer` refactorizado: eliminada la `ProceduralCar` de cajas. El
  fallback ante error de carga ahora es la foto de referencia + mensaje con
  la ruta del archivo esperado, igual que `FordFocusModel3D`.
- `CarPage` resuelve el modelo con un HEAD check progresivo: primero el
  profesional ST-Line, después el genérico, después el fallback DOM.

## Validaciones

```bash
npm run lint    # 0 errores, 24 warnings (set-state-in-effect en guards)
npm run build   # ✓ pasa
```

## Roadmap post-MVP

- Predicción de costes (ML)
- Exportación PDF/CSV
- Notificaciones email para alertas
- Modelo 3D ST-Line 2023 definitivo (ver sección anterior)
- Fotogrametría del coche real
- App móvil nativa (React Native)
- Suite de tests (Vitest + Testing Library)
- CI/CD con GitHub Actions
- PWA + push notifications

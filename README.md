# Car Maintenance Tracker (CMT)

App multiusuario para gestionar el mantenimiento del coche con visualización 3D interactiva.

**Stack:** React 18 + Vite + TypeScript + Three.js (R3F) + Tailwind v4 + Zustand · Node.js + Express + Supabase (Auth + Postgres + Storage)

## Estructura

```
car-maintenance-tracker/
├── src/                  # Frontend React
├── server/               # Backend Express
└── supabase/schema.sql   # Schema + RLS policies
```

## Setup

### 1. Supabase

1. Crea proyecto en [supabase.com](https://supabase.com)
2. SQL Editor → pega el contenido de `supabase/schema.sql` y ejecuta
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
- **Permisos:** Row Level Security en Postgres (ver `supabase/schema.sql`). Owner ve y modifica todo. Editor lee y escribe registros pero no borra el vehículo. Viewer solo lee.
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

## Roadmap post-MVP

- Predicción de costes (ML)
- Exportación PDF/CSV
- Notificaciones email para alertas
- Modelo 3D real (GLTF) del Ford Focus en lugar del procedural actual
- Fotogrametría del coche real
- App móvil nativa (React Native)

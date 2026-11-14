# MIA — Agenda y asistencia

Aplicación web para gestionar la agenda bisemanal (semana A/B), asistencia diaria y pagos de una fundación que atiende niños con discapacidad.

## Requisitos

- Node.js 20+

## Setup local

```bash
npm install
npm run db:setup
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

Copia `.env.example` a `.env.local` y define al menos:

```bash
AUTH_SECRET=una-clave-larga-aleatoria
DATABASE_PATH=mia.db
```

**Local siempre usa SQLite** en `data/mia.db`.  
No pongas `TURSO_*` en `.env.local` si quieres que lo local no toque producción.

### Credenciales iniciales

- Correo: `admin@mia.local`
- Contraseña: `admin123`

## Turso (solo producción)

1. Crea la DB en el [dashboard de Turso](https://turso.tech) y genera un token **Read and write**
2. En **Vercel → Environment Variables** (no en `.env.local`):

```bash
AUTH_SECRET=...
TURSO_DATABASE_URL=libsql://mia-....turso.io
TURSO_AUTH_TOKEN=...
```

3. Una sola vez, para preparar el schema en Turso (temporalmente):

```bash
# solo para setup inicial de prod
$env:TURSO_DATABASE_URL="libsql://..."
$env:TURSO_AUTH_TOKEN="..."
npm run db:setup
```

O configura esas vars solo ese momento y luego quítalas de `.env.local`.

4. Deploy en Vercel.

## Módulos

- **Asistencia:** selección múltiple y marcado en bloque por especialidad
- **Agenda:** horarios bisemanales (A/B) con reasignar / editar / liberar
- **Niños:** alta, monto mensual y activar/desactivar
- **Pagos:** registro mensual y export a Excel
- **Reportes:** % mensual por niño y especialidad
- **Configuración (admin):** usuarios, días de atención y ciclo A/B

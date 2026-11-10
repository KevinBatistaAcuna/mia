# MIA — Agenda y asistencia

Aplicación web para gestionar la agenda bisemanal (semana A/B) y la asistencia diaria de una fundación que atiende niños con discapacidad.

## Requisitos

- Node.js 20+

## Setup

```bash
npm install
npm run db:setup
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Credenciales iniciales

- Correo: `admin@mia.local`
- Contraseña: `admin123`

## Módulos

- **Asistencia:** selección múltiple y marcado en bloque por especialidad
- **Agenda:** horarios bisemanales (A/B) con reasignar / editar / liberar
- **Niños:** alta y activar/desactivar
- **Reportes:** % mensual por niño y especialidad
- **Configuración (admin):** usuarios y fecha de inicio del ciclo A/B

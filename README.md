# AMS Backend Sprint 1

Este repositorio contiene la base del backend para el MVP de Auditoría (Sprint 1).

## Requisitos

- Node.js 20+
- npm 10+

## Configuración

1. Copia `.env.example` a `.env` y ajusta los valores si es necesario.
2. Instala dependencias:

```bash
npm install
```

## Comandos disponibles

- `npm run dev`: inicia el servidor en modo desarrollo.
- `npm run build`: compila a JavaScript.
- `npm start`: ejecuta la versión compilada.
- `npm run lint`: ejecuta ESLint.
- `npm run typecheck`: valida tipos con TypeScript.
- `npm test`: ejecuta pruebas unitarias e integración.
- `npm run accept`: ejecuta lint, typecheck y pruebas (QA del sprint).

## Endpoints principales

- `POST /api/auth/login`: autenticación con bloqueo por intentos fallidos.
- `POST /api/auth/refresh`: renovación de tokens.
- `POST /api/auth/logout`: revoca tokens activos.
- `GET/POST/PATCH /api/users`: gestión de usuarios (solo rol ADMIN).
- `GET/POST/PATCH /api/projects`: CRUD de proyectos con control de membresías.

Todas las respuestas protegidas incluyen encabezados `Cache-Control: no-store`, `Pragma: no-cache` y `Expires: 0`. Helmet y rate limiting están configurados según los criterios de aceptación del sprint.

## Datos iniciales

El sistema incluye un usuario administrador inicial:

- Email: `admin@example.com`
- Password: `Admin123!`

También se crea la compañía `Acme Corp` para las pruebas.

## Pruebas

Se incluyen pruebas unitarias para el servicio de autenticación y pruebas de integración que cubren los flujos críticos del sprint (login, bloqueo, gestión de usuarios, proyectos y refresh/logout). Ejecuta `npm run accept` para validar la calidad antes de desplegar.

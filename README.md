# AMS Backend — MVP Auditoría

Este repositorio contiene la base del backend para el MVP de Auditoría. El Sprint 1 ya se encuentra entregado (autenticación, gestión de usuarios/compañías y middleware de seguridad) y el Sprint 2 también fue liberado: ahora el wizard de creación de auditorías siembra categorías, riesgos, checklists, KPIs y gobernanza inicial automáticamente y el overview consolida la información resultante con controles de permisos end-to-end.

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
- `GET /api/projects/:id/overview`: entrega KPIs, checklists, riesgos y gobernanza del proyecto.

Todas las respuestas protegidas incluyen encabezados `Cache-Control: no-store`, `Pragma: no-cache` y `Expires: 0`. Helmet y rate limiting están configurados según los criterios de aceptación del sprint. La definición completa de pendientes y roadmap se mantiene en [`docs/issues.md`](docs/issues.md).

## Datos iniciales

El sistema incluye un usuario administrador inicial:

- Email: `admin@example.com`
- Password: `Admin123!`

También se crea la compañía `Acme Corp` para las pruebas.

## Cómo probar en local

1. Asegúrate de haber seguido la sección de **Configuración** y tener las dependencias instaladas.
2. Inicia la base de datos en memoria y las semillas ejecutando las pruebas (no se requiere paso adicional).
3. Ejecuta los siguientes comandos según lo que quieras validar:
   - `npm test`: corre las pruebas unitarias y de integración.
   - `npm run lint`: valida el estilo de código con ESLint.
   - `npm run typecheck`: verifica los tipos con TypeScript.
   - `npm run accept`: ejecuta lint, typecheck y pruebas en secuencia, equivalente al QA del sprint.

> Consejo: durante el desarrollo puedes lanzar `npm run dev` en otra terminal para probar la API manualmente mientras ejecutas las pruebas.

## Pruebas y QA

Se incluyen pruebas unitarias para el servicio de autenticación y pruebas de integración que cubren los flujos críticos del Sprint 1 (login, bloqueo, gestión de usuarios, proyectos, overview y refresh/logout). Ejecuta `npm run accept` para validar la calidad antes de desplegar.

Para seguir el estado del roadmap y los nuevos criterios de aceptación en preparación, revisa la sección **Próximos entregables prioritarios** en [`docs/issues.md`](docs/issues.md).

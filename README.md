# AMS Backend — MVP Auditoría

Este repositorio contiene la base del backend para el MVP de Auditoría. Los Sprint 1 y 2 están en producción con autenticación, gestión de usuarios/compañías, middleware de seguridad, wizard de creación y overview consolidado. Con el cierre del Sprint 3 añadimos la operación diaria: solicitudes de información con adjuntos, gestión de riesgos/hallazgos y aprobaciones de cambios de alcance.

## Documentación Sprint 0

- [Sprint 0 — Fundación y Arquitectura](docs/sprint-0-foundation.md): arquitectura de referencia, modelo multi-tenant y lineamientos de CI/CD y backups.

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
- `npm test`: ejecuta pruebas unitarias e integración con cobertura habilitada.
- `npm run coverage`: genera nuevamente el reporte de cobertura en `coverage/` (formato texto y LCOV para CI).
- `npm run test:e2e`: ejecuta la suite de Playwright que recorre login, wizard, data request y aprobación.
- `npm run accept`: ejecuta lint, typecheck y pruebas (QA del sprint).

## Frontend (Sprints F1 y F2)

El frontend en Next.js vive en [`apps/web`](apps/web). Para ejecutarlo localmente:

```bash
cd apps/web
npm install
npm run dev
```

Configura la variable `API_BASE_URL` si el backend corre en una URL distinta a `http://localhost:3000`.

El Sprint F1 entrega el formulario de login con validaciones, persistencia de sesión mediante cookies HTTP-only, middleware de
rutas protegidas y un layout principal con navegación hacia los módulos clave (dashboard, proyectos, solicitudes y aprobaciones).
El Sprint F2 suma el wizard de creación de auditorías en `/projects/new`, validaciones con Zod, envío autenticado hacia el
endpoint `POST /api/projects` y un resumen previo a la creación con objetivos, stakeholders, hitos y riesgos iniciales.

## Endpoints principales

- `POST /api/auth/login`: autenticación con bloqueo por intentos fallidos.
- `POST /api/auth/refresh`: renovación de tokens.
- `POST /api/auth/logout`: revoca tokens activos.
- `GET/POST/PATCH /api/users`: gestión de usuarios (solo rol ADMIN).
- `GET/POST/PATCH /api/projects`: CRUD de proyectos con control de membresías.
- `GET /api/projects/:id/overview`: entrega KPIs, checklists, riesgos y gobernanza del proyecto.
- `GET/POST/PATCH /api/projects/:id/data-requests`: gestión de solicitudes de información y su workflow de estados.
- `POST/GET /api/projects/:id/data-requests/:dataRequestId/files`: adjuntos asociados a solicitudes.
- `GET/POST/PATCH /api/projects/:id/risks`: alta y seguimiento de riesgos.
- `GET/POST/PATCH /api/projects/:id/findings`: hallazgos vinculados a riesgos y solicitudes.
- `GET/POST/PATCH /api/projects/:id/approvals`: aprobaciones de cambios de alcance con historial.
- `GET /health`: endpoint liviano de observabilidad para verificaciones de uptime.
- `GET /metrics`: exporta métricas en formato Prometheus (conteos de usuarios, proyectos, solicitudes y aprobaciones).

Todas las respuestas protegidas incluyen encabezados `Cache-Control: no-store`, `Pragma: no-cache` y `Expires: 0`. Helmet y rate limiting están configurados según los criterios de aceptación del sprint. La definición completa de pendientes y roadmap se mantiene en [`docs/issues.md`](docs/issues.md).

## Datos iniciales

El sistema incluye un usuario administrador inicial:

- Email: `admin@example.com`
- Password: `Admin123!`

También se crea la compañía `Acme Corp` para las pruebas.

Para los cimientos multi-tenant el seed genera el tenant `Acme Consulting`, su área matriz “Oficina Central” y el contrato marco `CNT-0001`, lo que permite comenzar a modelar jerarquías internas y vigencias comerciales desde el Sprint 0.【F:src/lib/prisma.ts†L38-L83】

## Cómo probar en local

1. Asegúrate de haber seguido la sección de **Configuración** y tener las dependencias instaladas.
2. Inicia la base de datos en memoria y las semillas ejecutando las pruebas (no se requiere paso adicional).
3. Ejecuta los siguientes comandos según lo que quieras validar:
   - `npm test`: corre las pruebas unitarias e integración y deja el reporte de cobertura listo en `coverage/`.
   - `npm run coverage`: fuerza una nueva corrida de Jest con cobertura (útil en CI para publicar artefactos).
   - `npm run test:e2e`: levanta la app en memoria y recorre los flujos críticos con Playwright.
   - `npm run lint`: valida el estilo de código con ESLint.
   - `npm run typecheck`: verifica los tipos con TypeScript.
   - `npm run accept`: ejecuta lint, typecheck y pruebas en secuencia, equivalente al QA del sprint.

> Consejo: durante el desarrollo puedes lanzar `npm run dev` en otra terminal para probar la API manualmente mientras ejecutas las pruebas.

## Pruebas y QA

Se incluyen pruebas unitarias, de integración y ahora también de extremo a extremo (Playwright) que cubren autenticación, overview, solicitudes de información, riesgos, hallazgos y aprobaciones. Ejecuta `npm run accept` para validar la calidad antes de desplegar.

La última corrida de `npm test` (Jest con cobertura habilitada por defecto) reporta 93.01 % de *statements* y 93.05 % de líneas cubiertas sobre servicios, middleware y utilidades. El reporte en `coverage/lcov-report` puede publicarse automáticamente en CI junto con los artefactos de Playwright (`playwright-report`).

El endpoint `/metrics` permite integrar el backend con Prometheus desde el primer día. Incluye conteos totales y por estado de proyectos, solicitudes y aprobaciones para monitorear la operación.

Para seguir el estado del roadmap y los nuevos criterios de aceptación en preparación, revisa la sección **Próximos entregables prioritarios** en [`docs/issues.md`](docs/issues.md).

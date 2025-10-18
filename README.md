# AMS Auditoría — Plataforma Backend & Web

Sistema SaaS para gestionar auditorías consultivas con enfoque multi-tenant. Este repositorio contiene el backend Express + Prisma, el frontend Next.js y el conjunto de pruebas automatizadas que validan los entregables hasta el Sprint 9.

## Tabla de contenidos
1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [Arquitectura y módulos](#arquitectura-y-módulos)
3. [Stack y requisitos](#stack-y-requisitos)
4. [Puesta en marcha](#puesta-en-marcha)
5. [Scripts de QA y verificación](#scripts-de-qa-y-verificación)
6. [Datos iniciales y multi-tenant](#datos-iniciales-y-multi-tenant)
7. [Estructura del repositorio](#estructura-del-repositorio)
8. [Documentación y evolución](#documentación-y-evolución)

## Resumen ejecutivo
- Backend en Node.js 20+ con Express, Prisma y Pino que expone APIs autenticadas (`/api/auth`, `/api/users`, `/api/projects`, `/metrics`, `/health`).
- Frontend en Next.js (`apps/web`) que entrega login, wizard de creación de auditorías y consumo de KPIs/portal cliente.
- Seeds multi-tenant para iniciar con compañías, proyectos, contratos y membresías representativas.
- Cobertura de pruebas automatizadas (unitarias, integración y E2E) que valida autenticación, wizard, operación diaria, métricas y benchmarking del Sprint 9.

## Arquitectura y módulos
- **Presentación**: Next.js con Material UI; middleware de rutas protegidas y consumo de APIs mediante fetch autenticado.
- **Servicios backend**: Express orquesta rutas REST con validaciones Zod, control de permisos por rol/membresía y registro en `AuditLog`.
- **Datos**: Prisma opera sobre almacenamiento en memoria para desarrollo y PostgreSQL en despliegues, con seeds definidos en `src/lib/prisma.ts`.
- **Observabilidad y seguridad**: Helmet (CSP, HSTS), rate limiting, logs estructurados y endpoint `/metrics` listo para Prometheus.

## Stack y requisitos
- Node.js 20+
- npm 10+
- Playwright para pruebas E2E (se instala con `npm install`)

## Puesta en marcha
1. Duplicar `.env.example` como `.env` y ajustar secretos si es necesario.
2. Instalar dependencias en la raíz del repo:
   ```bash
   npm install
   ```
3. Levantar la API en modo desarrollo:
   ```bash
   npm run dev
   ```
4. (Opcional) Ejecutar el frontend:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
   Configura `API_BASE_URL` si el backend no corre en `http://localhost:3000`.

## Scripts de QA y verificación
| Comando | Descripción |
| --- | --- |
| `npm run dev` | Levanta la API con recarga en caliente. |
| `npm run build` / `npm start` | Compila a JavaScript y ejecuta el servidor productivo. |
| `npm run lint` | Ejecuta ESLint sobre el monorepo. |
| `npm run typecheck` | Valida tipos con TypeScript. |
| `npm test` | Corre Jest con cobertura activada. |
| `npm run coverage` | Regenera el reporte de cobertura en `coverage/`. |
| `npm run test:e2e` | Ejecuta la suite Playwright (login, wizard, data request, approval). |
| `npm run accept` | Encadena lint + typecheck + test como QA previo a release. |

## Datos iniciales y multi-tenant
- Usuario administrador: `admin@example.com` / `Admin123!`.
- Seed inicial crea la consultora `Acme Consulting`, la compañía cliente `Acme Corp`, jerarquías (`TenantArea`) y el contrato marco `CNT-0001`.
- Los seeds también generan categorías de auditoría, riesgos plantilla, checklists, KPIs y gobernanza para nuevos proyectos.

## Estructura del repositorio
```
apps/web/              # Frontend Next.js
src/                   # Código del backend (rutas, servicios, lib Prisma)
tests/                 # Pruebas unitarias e integración
accept.sh              # Pipeline QA local (lint + typecheck + test)
docs/                  # Documentación consolidada y material de referencia
```

## Documentación y evolución
Toda la documentación histórica (plan de implementación, revisiones de sprint, backlog y próximos pasos) se consolidó en [`docs/project-evolution.md`](docs/project-evolution.md). Revísalo para seguir la evolución completa del programa desde Sprint 0 hasta Sprint 9 y el roadmap planeado.

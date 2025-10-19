# Evolución del Proyecto AMS

Este documento concentra la historia funcional y técnica del backend de Auditoría para Consultorías (AMS) desde los cimientos hasta el Sprint 9, integrando hitos, alcance por iteración y próximos pasos.

## 1. Visión y Alcance Inicial
- **Objetivo**: convertir el prototipo de auditorías en una plataforma SaaS multi-tenant que soporte levantamiento, ejecución y medición de iniciativas para consultoras y sus clientes.
- **Modelo operativo**: arquitectura API-first en Node.js/Express con Prisma y PostgreSQL, frontend Next.js en `apps/web`, despliegue contenerizado y pipelines CI/CD automatizados.
- **Principios de calidad**: seguridad por defecto (MFA planificado, RBAC/ABAC, cifrado TLS), observabilidad integrada (`/metrics`, logging estructurado), pruebas automatizadas (unitarias, integración, E2E) y gobernanza ágil con sprints de tres semanas.

## 2. Roadmap Macro
| Fase | Sprints | Alcance clave |
| --- | --- | --- |
| **MVP** | 0 – 5 | Fundaciones multi-tenant, gobernanza inicial, wizard de auditorías, operación diaria (solicitudes, riesgos, hallazgos, aprobaciones), métricas y portal cliente con KPIs. |
| **Pro** | 6 – 7 | Gestión documental con auditoría avanzada, administración de la firma consultora (staffing, costos, facturación) y ampliación de analítica. |
| **Enterprise** | 8 + | Reutilización inteligente, benchmarking sectorial, motor de recomendaciones y conectores ERP/CRM/BI de nivel corporativo. |

## 3. Cronología de Entregas
### Sprint 0 — Fundación y Arquitectura
- Arquitectura de referencia con capas de presentación, servicios, datos y observabilidad.
- Boilerplate TypeScript con alias `@/`, pipelines de lint/type/test y seeds multi-tenant (`Tenant`, `TenantArea`, `Contract`).
- Plan de gestión de secretos, ambientes y estrategia de backup/DR documentada.

### Sprint 1 — Gobernanza y Configuración
- Autenticación robusta con control de intentos (`/api/auth/*`) y cabeceras anti-cache.
- CRUD de usuarios, roles y compañías con controles de membresía y bitácora.
- Modelado inicial de proyectos (`Company`, `Project`, `Membership`) y `AuditLog` operacional.

### Sprint 2 — Setup Wizard y Siembra
- Wizard Next.js `/projects/new` con validaciones Zod y persistencia en backend (`POST /api/projects`).
- Siembra automática de categorías, riesgos plantilla, checklists, KPIs y gobernanza al crear proyectos.
- Endpoint `/api/projects/:id/overview` protegido con consolidado de KPIs, riesgos y pendientes.

### Sprint 3 — Operación Diaria
- Gestión de solicitudes de información con archivos (`/data-requests`), estados y permisos.
- Módulos de riesgos e hallazgos vinculados a solicitudes, incluyendo audit trail.
- Flujos de aprobaciones de alcance con historial y controles RBAC.

### Sprint 4 — Hardening y Calidad
- Cobertura de pruebas > 81 % (unitarias + integración) y suite E2E Playwright para flujos críticos.
- Seguridad reforzada (Helmet con CSP, rate limiting) y endpoint `/metrics` para Prometheus.
- Documentación de comandos de QA y pipeline `accept.sh` como guardrail previo a despliegues.

### Sprint 5 — KPIs y Portal del Cliente
- Portal cliente con snapshot de avances, alertas e hitos por proyecto con control de acceso.
- APIs de métricas y KPIs para portafolio, incluyendo overview y métricas públicas.
- Pruebas unitarias específicas para `portalService`, `metricsService` y rutas Next.js protegidas.

### Sprint 6 — Gestión Documental y Evidencias *(planeado)*
- Centralización documental con control de versiones y publicación controlada.
- Auditoría de cambios con firmas digitales y trazabilidad legal.
- Integración de evidencia y checklist de cumplimiento normativo.

### Sprint 7 — Administración de la Firma *(planeado)*
- Staffing y utilización con analytics básicos por consultor y proyecto.
- Gestión de costos, márgenes y facturación configurable (hitos/mensualidades).
- Integraciones iniciales con ERP/contabilidad para exportes financieros.

### Sprint 8 — Inteligencia y Reutilización *(planeado)*
- Catálogo de plantillas reutilizables y librería de casos de éxito.
- Motor de recomendaciones basado en reglas y aprendizaje supervisado.
- Conectores externos (ERP, CRM, BI) y datasets listos para Power BI/Tableau.

### Sprint 9 — Benchmarking y Feedback Operativo
- Endpoints `/api/projects/:id/benchmark` y `/snapshots` para reportes comparativos y series históricas.
- Persistencia in-memory de snapshots y feedback auditado (utilidad/confianza 1-5) con `submittedAt`.
- Suites unitarias/integradas que recorren generación de benchmark, recuperación de snapshots y validación de feedback.

### Sprint 10 — Inteligencia Predictiva de Portafolio
- Tendencias de benchmark con analítica de momentum que consolidan snapshots en `/api/projects/:id/benchmark/trends`.
- Tablero de ranking multi-proyecto en `/api/projects/benchmark/leaderboard` con métricas configurables y controles de permisos.
- Pruebas unitarias e integrales para validar cálculos de tendencias, restricciones de acceso y rutas expuestas.

## 4. Estado Actual y Salud del Repositorio
- Backend y frontend Next.js operativos; seeds crean `Acme Corp`, `Acme Consulting` y usuario admin (`admin@example.com / Admin123!`).
- Cobertura de pruebas mantenida mediante `npm run accept` (lint + typecheck + test) y reportes `coverage/` y `playwright-report/` listos para CI.
- Observabilidad básica habilitada (`/health`, `/metrics`) y headers de seguridad (`Cache-Control`, `Pragma`, `Expires`) aplicados por defecto.

## 5. Próximos Pasos Recomendados
1. Formalizar playbook de despliegue MVP (migraciones Prisma, pipelines Docker/IaC).
2. Completar backlog post-MVP: internacionalización del front, reportes PDF, recordatorios automáticos.
3. Preparar ADRs de seguridad (MFA, gestión de claves) y gobernanza de datos para etapas Pro/Enterprise.

La información previa dispersa en múltiples documentos se integra aquí para facilitar el seguimiento integral del programa.

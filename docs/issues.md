# MVP Auditoría 1.0 — Backlog Inicial

Este documento propone la descomposición del PRD en historias de usuario y tareas técnicas atómicas.
Cada ticket incluye criterios de aceptación (CA) y checklist de QA.

## Estado actual (Sprint 1 completado)

El alcance del Sprint 1 está entregado en la rama principal:

- Autenticación con control de intentos fallidos, expiración de bloqueos y registro en `AuditLog`.
- CRUD de usuarios con permisos administrados por rol, validaciones Zod y auditoría de acciones.
- CRUD de compañías/proyectos con restricciones por membresía, unicidad por compañía y logging.
- Middleware y utilidades técnicas (Helmet, rate limiting, Pino, cabeceras anti-cache) más script `accept` y pruebas automatizadas cubriendo los flujos críticos.

Los siguientes bloques quedan como referencia histórica del Sprint 1, pero no requieren más trabajo salvo regresiones.

## Sprint 1 — Backend base ✅

### 1.1 Autenticación con control de intentos
- **Historia**: Como usuario, quiero iniciar sesión de forma segura.
- **Tareas**:
  - Implementar endpoints `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` con tokens JWT y bcrypt.
  - Añadir bloqueo tras N intentos fallidos y registro en `AuditLog`.
  - Configurar middleware de cabeceras `no-store` y sin `ETag`.
- **CA**:
  - Login correcto devuelve tokens y perfil.
  - Intentos fallidos consecutivos bloquean durante ventana configurada.
  - Todas las respuestas autenticadas incluyen cabeceras anti-cache.
- **QA**:
  - Tests unitarios de servicios Auth.
  - Test E2E login (éxito/fallo/bloqueo).
  - Revisar headers en `accept.sh`.

### 1.2 Gestión de usuarios y roles (admin)
- **Historia**: Como admin, quiero gestionar usuarios.
- **Tareas**:
  - CRUD de usuarios (`GET/POST/PATCH /api/users`).
  - Validaciones de entrada con Zod.
  - Cobertura de permisos por rol.
- **CA**:
  - Solo admin accede a endpoints.
  - Rol actualizado se refleja inmediatamente.
- **QA**:
  - Tests unitarios de autorización.
  - E2E: admin crea y actualiza usuario.

### 1.3 CRUD de compañías y proyectos base
- **Historia**: Como admin/consultor, quiero crear auditorías.
- **Tareas**:
  - Modelar entidades Company, Project, Membership.
  - Endpoints `GET/POST/PATCH /api/projects` con filtros por permisos.
  - Registrar eventos en `AuditLog`.
- **CA**:
  - Proyecto único por `companyId + name`.
  - Listado restringido a miembros o compañía.
- **QA**:
  - Tests unitarios de repositorio/servicios.
  - E2E: creación y lectura de proyecto.

### 1.4 Infraestructura técnica
- **Historia**: Como desarrollador, quiero observar logs y garantizar calidad.
- **Tareas**:
  - Configurar Pino + Prisma logging.
  - Añadir Helmet con CSP/HSTS y rate limiter (300 rpm).
  - Asegurar scripts `lint`, `typecheck`, `test`, `accept.sh` en CI.
- **CA**:
  - Logs visibles en distintos niveles.
  - Lint/type/test ejecutados en pipeline.
- **QA**:
  - Revisar configuración en CI.
  - Ejecutar `accept.sh` localmente.

## Sprint 2 — Setup Wizard & correlación (próximo)

### 2.1 Wizard de creación de auditoría
- **Historia**: Como consultor, quiero guiarme para crear auditoría.
- **Tareas**:
  - Frontend `/projects/new` con 4 pasos y validaciones.
  - Endpoint `POST /api/projects` aceptando payload del wizard.
  - Guardar progreso intermedio (local state) y soportar reanudación.
- **CA**:
  - Completar wizard crea proyecto con relaciones iniciales.
  - Validaciones cliente/servidor coherentes.
- **QA**:
  - E2E: flujo completo del wizard.
  - Tests de componentes de formularios.

### 2.2 Seeds de estructura inicial
- **Historia**: Como consultor, quiero plantillas base al crear auditoría.
- **Tareas**:
  - Crear servicios que generen categorías, riesgos plantilla, checklists y KPIs.
  - Asociar miembros y gobernanza (comités, reuniones, flujos).
- **CA**:
  - Proyecto nuevo muestra datos iniciales en overview.
  - AuditLog refleja creación masiva.
- **QA**:
  - Tests unitarios de servicios de seed.
  - Validación manual del overview.

### 2.3 Overview del proyecto
- **Historia**: Como miembro, quiero ver resumen al entrar.
- **Tareas**:
  - Ruta `/projects/:id` con KPIs, pendientes, riesgos top.
  - Endpoint `/api/projects/:id/overview` consolidando datos.
- **CA**:
  - KPIs, riesgos abiertos y solicitudes pendientes visibles.
  - Permisos verificados por membresía.
- **QA**:
  - Tests de integración para agregaciones.
  - Snapshot tests UI overview.

## Sprint 3 — Módulos operativos

### 3.1 Data Requests con gestión de archivos
- **Historia**: Como cliente, quiero responder solicitudes.
- **Tareas**:
  - CRUD `/api/projects/:id/data-requests` con estados.
  - Integración de subida de archivos con control de acceso.
  - UI `/projects/:id/data-requests` con filtros/acciones.
- **CA**:
  - Estados permitidos: pendiente, en revisión, aprobada, rechazada.
  - Archivos sólo accesibles para miembros autorizados.
- **QA**:
  - Tests unitarios de flujo de estado.
  - E2E: cliente sube evidencia; consultor aprueba.

### 3.2 Gestión de riesgos y hallazgos
- **Historia**: Como consultor, quiero evaluar riesgos y hallazgos.
- **Tareas**:
  - CRUD de riesgos con linking a procesos/sistemas.
  - CRUD de hallazgos vinculados a riesgos/solicitudes.
  - UI `/projects/:id/risks` y `/projects/:id/findings` con navegación cruzada.
- **CA**:
  - Cambios registran AuditLog.
  - Relacionar un hallazgo permite navegar a riesgo/solicitud.
- **QA**:
  - Tests unitarios de relaciones.
  - E2E: creación riesgo + hallazgo vinculado.

### 3.3 Aprobaciones (Scope Change)
- **Historia**: Como comité, quiero aprobar cambios de alcance.
- **Tareas**:
  - Endpoint `/api/projects/:id/approvals` para iniciar y transicionar estados.
  - UI `/projects/:id/approvals` con historial y audit trail.
- **CA**:
  - Estados: pendiente, aprobado, rechazado.
  - Eventos guardados en AuditLog con usuario y timestamp.
- **QA**:
  - Tests unitarios de reglas de aprobación.
  - E2E: crear aprobación y aprobar/rechazar.

## Sprint 4 — Hardening y calidad

### 4.1 Cobertura de pruebas y métricas
- **Historia**: Como líder técnico, quiero garantías de calidad.
- **Tareas**:
  - Aumentar cobertura unit ≥80% en dominio/servicios.
  - Configurar tests E2E (Playwright) para flujos clave.
  - Documentar comandos en README/ADR.
- **CA**:
  - Reportes de cobertura cumplen objetivo.
  - Playwright ejecuta login, wizard, data request, approval.
- **QA**:
  - Revisar reportes en CI.
  - Ejecutar `accept.sh` y compartir resultados.

### 4.2 Seguridad y observabilidad adicional
- **Historia**: Como responsable de seguridad, quiero reforzar la plataforma.
- **Tareas**:
  - Afinar CSP en Helmet y verificar ausencia de mixed content.
  - Implementar endpoint `/metrics` (Prometheus) o documentar plan MVP+1.
  - Revisar rate limiting en ambientes y ajustar umbrales.
- **CA**:
  - Seguridad validada en revisión manual.
  - Documentación de métricas disponible.
- **QA**:
  - Escaneos manuales de headers (curl).
  - Tests automatizados de headers en CI.

## Backlog adicional (Post-MVP)
- Internacionalización del front.
- Integración con repositorio de políticas.
- Reportes PDF con hallazgos y KPIs.
- Automatización de recordatorios por email/slack.


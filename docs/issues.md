# MVP Auditoría 1.0 — Backlog Inicial

Este documento propone la descomposición del PRD en historias de usuario y tareas técnicas atómicas.
Cada ticket incluye criterios de aceptación (CA) y checklist de QA.

## Estado actual (Sprint 1, 2 y 3 completados; Sprint 4 en preparación)

- ✅ **Sprint 1** está liberado en la rama principal con autenticación robusta, CRUD de usuarios/compañías y middleware de seguridad completo.
- ✅ **Sprint 2** fue entregado con el wizard de creación sembrando automáticamente categorías, riesgos, checklists, KPIs y gobernanza para nuevos proyectos, más el overview consolidado protegido por permisos.
- ✅ **Sprint 3** quedó cerrado con solicitudes de información (archivos incluidos), gestión integral de riesgos/hallazgos y flujos de aprobaciones.

La tabla siguiente recoge los entregables inmediatos priorizados para Sprint 4.

Los bloques de Sprints 1 a 3 permanecen como referencia histórica y sólo requieren atención ante regresiones.

### Próximos entregables prioritarios

| Historia | Estado | Notas |
| --- | --- | --- |
| Cobertura de pruebas y métricas | Refinado | Elevar cobertura ≥80 % en servicios y publicar reportes en CI. |
| Seguridad y observabilidad adicional | En discovery | Afinar CSP/Helmet, documentar plan de métricas y validar rate limiting. |
| Preparación de despliegues MVP | Ideación | Definir playbook de ambientes y checklist de release. |

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

## Sprint 2 — Setup Wizard & correlación ✅

Las tres historias del sprint se encuentran en producción y están cubiertas por pruebas de integración que ejercitan la creación de proyectos, el seeding automático y el overview consolidado.

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
  - Pruebas de integración `tests/integration/app.test.ts` validan creación de proyectos vía wizard, auditoría de eventos y overview tras la siembra inicial.

### 2.2 Seeds de estructura inicial
- **Historia**: Como consultor, quiero plantillas base al crear auditoría.
- **Tareas**:
  - Crear servicios que generen categorías, riesgos plantilla, checklists y KPIs.
  - Asociar miembros y gobernanza (comités, reuniones, flujos).
- **CA**:
  - Proyecto nuevo muestra datos iniciales en overview.
  - AuditLog refleja creación masiva.
- **QA**:
  - Pruebas de integración `tests/integration/app.test.ts` cubren siembra de categorías, riesgos, checklists, KPIs y eventos de gobernanza, incluyendo datos por defecto cuando faltan secciones del wizard.

### 2.3 Overview del proyecto
- **Historia**: Como miembro, quiero ver resumen al entrar.
- **Tareas**:
  - Ruta `/projects/:id` con KPIs, pendientes, riesgos top.
  - Endpoint `/api/projects/:id/overview` consolidando datos.
- **CA**:
  - KPIs, riesgos abiertos y solicitudes pendientes visibles.
  - Permisos verificados por membresía.
- **QA**:
  - Pruebas de integración `tests/integration/app.test.ts` ejercitan el endpoint `/api/projects/:id/overview`, ordenan pendientes y riesgos y validan permisos ante usuarios sin membresía.

## Sprint 3 — Módulos operativos ✅

### 3.1 Data Requests con gestión de archivos
- **Historia**: Como cliente, quiero responder solicitudes.
- **Tareas**:
  - CRUD `/api/projects/:id/data-requests` con estados (`PENDING`, `IN_REVIEW`, `APPROVED`, `REJECTED`).
  - Integración de subida de archivos con control de acceso (`POST/GET /files`).
  - UI `/projects/:id/data-requests` con filtros/acciones.
- **CA**:
  - Estados permitidos: pendiente, en revisión, aprobada, rechazada.
  - Archivos sólo accesibles para miembros autorizados.
- **QA**:
  - Tests unitarios de flujo de estado y validación de adjuntos.
  - E2E: cliente sube evidencia; consultor aprueba (cubierto en `tests/integration/app.test.ts`).

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
  - E2E: creación riesgo + hallazgo vinculado (cubierto en `tests/integration/app.test.ts`).

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
  - E2E: crear aprobación y aprobar/rechazar (cubierto en `tests/integration/app.test.ts`).

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


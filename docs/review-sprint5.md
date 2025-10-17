# Revisión Sprint 5

## Alcance revisado
- Portal del cliente que consolida avances, alertas y próximos hitos por proyecto con acceso restringido al rol o membresía correspondiente.
- APIs de métricas y KPIs para dar seguimiento al portafolio (snapshot del portal, overview de proyecto y endpoint Prometheus).
- Cobertura de pruebas unitarias y de integración sobre KPIs, métricas operativas y restricciones de acceso para clientes.

## Evidencia
- `src/routes/portalRoutes.ts` y `src/services/portalService.ts` generan el snapshot completo del portal, calculan avances/alertas y limitan la visibilidad según el usuario autenticado. 【F:src/routes/portalRoutes.ts†L1-L21】【F:src/services/portalService.ts†L1-L360】
- `src/server.ts` publica `/metrics` con formato Prometheus reutilizando `collectPrometheusMetrics`, mientras que `apps/web/src/app/api/projects/[projectId]/overview/route.ts` expone el overview protegido para dashboards web. 【F:src/server.ts†L1-L73】【F:apps/web/src/app/api/projects/[projectId]/overview/route.ts†L1-L40】
- Las pruebas `tests/unit/portalService.test.ts`, `tests/unit/metricsService.test.ts` y `tests/unit/project-overview.next-route.test.ts` validan cálculos de KPIs/alertas, agregación de métricas y permisos al consumir la API desde Next.js. 【F:tests/unit/portalService.test.ts†L1-L196】【F:tests/unit/metricsService.test.ts†L1-L94】【F:tests/unit/project-overview.next-route.test.ts†L1-L71】

## Resultado
Las funcionalidades planificadas para el Sprint 5 están implementadas y cubiertas por pruebas automatizadas tanto en backend como en la capa Next.js, sin pendientes críticos detectados. Se puede continuar con la planificación del Sprint 6.

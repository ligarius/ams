# Frontend AMS — Plan de Arquitectura y Roadmap

## Objetivo
Diseñar y entregar una interfaz web robusta que consuma el backend existente del MVP de auditoría, garantizando una experiencia segura, accesible y escalable para consultores, clientes y comités.

## Principios de diseño
- **Domain-driven UI**: reflejar en la interfaz los mismos contextos del backend (auth, proyectos, solicitudes, riesgos, aprobaciones).
- **Accesibilidad AA**: cumplir WCAG 2.1 nivel AA desde el primer sprint.
- **Estrategia offline tolerante**: manejar pérdida temporal de conectividad con colas locales y reintentos.
- **Observabilidad end-to-end**: métricas de UX (Core Web Vitals), trazas de API y registros de errores en un único panel.
- **Seguridad por defecto**: mismas reglas de autorización del backend, mitigación de XSS/CSRF y gestión segura de tokens.

## Stack recomendado
| Capa | Elección | Justificación |
| --- | --- | --- |
| Framework | React 18 + Next.js App Router | Renderizado híbrido (SSR/SSG), rutas protegidas y soporte integrado para internacionalización y optimización de imágenes.
| Lenguaje | TypeScript estricto | Paridad de tipados con el backend y reducción de errores en UI.
| Estado global | TanStack Query + Zustand | Query caching + sincronización optimista; Zustand para estado local complejo.
| UI Kit | Radix UI + Tailwind + tokens propios | Componentes accesibles, diseño consistente y rápido time-to-market con personalización.
| Formularios | React Hook Form + Zod | Validaciones compartidas con backend y manejo de formularios performante.
| Autenticación | NextAuth (credenciales + refresh JWT) | Reutiliza endpoints actuales y facilita SSR de páginas protegidas.
| Observabilidad | Sentry + OpenTelemetry | Trazas correlacionadas front-back y captura de errores de cliente.
| QA visual | Storybook + Chromatic | Documentación viva de componentes y regresiones visuales automatizadas.

## Integración con backend
1. **API Client**: generar SDK mediante `openapi-typescript` a partir del contrato existente (`/swagger.json` si está disponible) o definir manualmente capas de servicios.
2. **Autenticación**: implementar flujo de login con persistencia de refresh token en HTTP-only cookie y access token en memoria (rotación automática).
3. **Control de permisos**: mapear roles y scopes del backend en guardias de rutas y componentes.
4. **Uploads**: usar `next-upload-handler` o endpoints dedicados con barra de progreso y reintentos.
5. **Realtime opcional**: preparar suscripción vía SSE/WebSockets para notificaciones (aprobaciones, comentarios) en MVP+1.

## Calidad y seguridad
- **Linter y formateo**: ESLint (config shareable con backend) + Prettier.
- **Type-safety**: `tsconfig` estricto, `ts-reset` para utilidades.
- **Testing**:
  - Unitarios: Vitest + Testing Library para componentes.
  - Integración: Playwright para flujos end-to-end usando el backend real o mockeado.
  - Contratos: Prism o MSW para validar escenarios offline/fallo del backend.
- **Seguridad**: CSP con nonce, Sanitización de inputs, uso de Trusted Types, protección CSRF en mutaciones.
- **Performance**: Lazy loading de rutas, suspense boundaries, memoización selectiva y prefetch de datos críticos.

## DevOps y entregables
- Pipeline CI: lint → typecheck → unit → storybook build → e2e.
- Revisión previa (preview env) con Vercel/Netlify conectada a rama de feature.
- Monitoreo: integración con Prometheus/Grafana vía exportación de métricas front (Web Vitals) y Sentry para alertas.

## Roadmap propuesto de sprints (frontend)
| Sprint | Objetivo | Entregables principales | QA/Checks |
| --- | --- | --- | --- |
| **F1** ✅ | Autenticación y layout base | Login, registro de sesión, layout protegido, navegación principal | Lint, unit tests auth, e2e login |
| **F2** ✅ | Wizard de proyectos | Pasos del wizard, validaciones Zod compartidas, integración con `POST /projects` | Tests de formularios, e2e creación proyecto |
| **F3** ✅ | Overview y dashboards | Página `/projects/:id`, componentes de KPIs, estado global | Testing Library + Playwright overview |
| **F4** 🚧 | Solicitudes de información | CRUD UI, subida de archivos, cola de reintentos | Tests de subida (MSW), e2e data request |

Con el entregable de overview publicado en el sprint F3, los esfuerzos se enfocan ahora en levantar el backlog detallado para F4
y preparar las integraciones de solicitudes de información (subidas, reintentos y guardado offline) antes de abrir desarrollo.
| **F5** | Riesgos y hallazgos | Vistas con tablas/kanban, linking cruzado, filtros avanzados | Visual regression, e2e riesgo→hallazgo |
| **F6** | Aprobaciones y notificaciones | Flujos de scope change, historial, toasts en vivo | E2E aprobaciones, pruebas de permisos |
| **F7** | Observabilidad y hardening | Monitoreo UX, optimización performance, auditorías seguridad | Core Web Vitals en CI, escaneo OWASP |

> **¿Un documento o varios?**
> Mantener este plan como documento maestro y abrir anexos por sprint cuando se detallen historias/tareas específicas. Así evitamos duplicación: el roadmap general vive aquí y cada sprint crea su propio doc o tickets en la herramienta de gestión.

## Próximos pasos
1. Validar stack y roadmap con stakeholders.
2. Generar design system base en Storybook (atoms/molecules).
3. Preparar backlog detallado en la herramienta de gestión (Jira/Linear) enlazando a este documento.
4. Configurar monorepo o repos separados (evaluar `pnpm` workspace si se comparte código).
5. Iniciar Sprint F1 tras aprobación, con definición de Definition of Done y métricas de aceptación.

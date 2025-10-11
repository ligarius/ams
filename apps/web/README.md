# AMS Web — Sprint F1

Este paquete contiene la base del frontend para el MVP de auditoría. El objetivo del Sprint F1 es habilitar el flujo de
autenticación, mantener la sesión y ofrecer un layout protegido con la navegación principal.

## Scripts

```bash
npm install
npm run dev
```

Variables de entorno disponibles:

- `API_BASE_URL`: URL del backend de AMS (por defecto `http://localhost:3000`).

## Entregables cubiertos

- Formulario de login con validaciones cliente (React Hook Form + Zod) y manejo de errores del backend.
- Persistencia de sesión mediante cookies HTTP-only y refresco automático del access token.
- Middleware que protege rutas y redirige al login cuando no existe sesión.
- Layout principal con cabecera, navegación entre módulos y botón de cierre de sesión.
- Vistas esqueleto para Proyectos, Solicitudes y Aprobaciones que conectarán con los módulos existentes del backend en próximos sprints.

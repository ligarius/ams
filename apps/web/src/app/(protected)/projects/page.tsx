import { ensureSession } from '@/lib/auth/session';

const projectSteps = [
  'Revisión de alcance y gobernanza inicial',
  'Checklist de riesgos priorizados',
  'Asignación de miembros y responsables',
  'Lanzamiento de solicitudes de información',
];

export default async function ProjectsPage() {
  const session = await ensureSession();
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200/80">Proyectos</p>
        <h1 className="text-2xl font-semibold text-slate-100">Tus auditorías activas</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Centraliza la creación y seguimiento de auditorías. Esta sección se conectará con el wizard y overview del backend para
          mostrar KPIs, riesgos prioritarios y gobernanza.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-base font-semibold text-slate-100">Siguientes pasos sugeridos</h2>
        <ol className="mt-4 space-y-2 text-sm text-slate-400">
          {projectSteps.map((step) => (
            <li key={step} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-400/60 text-[11px] font-semibold text-blue-200">
                ✓
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
        <p>
          ¡Hola {session?.user.email}! Próximamente aquí verás el listado de proyectos consultando el endpoint protegido del backend.
          El sprint actual se centra en dejar lista la autenticación y la estructura de layout.
        </p>
      </section>
    </div>
  );
}

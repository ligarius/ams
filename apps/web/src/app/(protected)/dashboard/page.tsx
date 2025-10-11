import { ensureSession } from '@/lib/auth/session';

const cards = [
  {
    title: 'Proyectos activos',
    description: 'Visualiza el estado de cada auditoría y sus próximos hitos.',
    href: '/projects',
  },
  {
    title: 'Solicitudes pendientes',
    description: 'Gestiona entregables y revisa archivos de soporte.',
    href: '/requests',
  },
  {
    title: 'Aprobaciones',
    description: 'Controla los cambios de alcance y mantén a los comités informados.',
    href: '/approvals',
  },
];

export default async function DashboardPage() {
  const session = await ensureSession();
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200/80">Inicio</p>
        <h1 className="text-3xl font-semibold text-slate-100">
          Hola, {session?.user.email ?? 'consultor'}
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Este panel concentra las actividades clave del sprint: autenticación segura, layout protegido y navegación principal.
          Desde aquí podrás saltar rápidamente a cada módulo operativo.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-blue-900/20 transition hover:border-blue-500/60 hover:shadow-blue-500/20"
          >
            <h2 className="text-lg font-semibold text-slate-100 group-hover:text-blue-200">{card.title}</h2>
            <p className="text-sm text-slate-400">{card.description}</p>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Explorar →</span>
          </a>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        <h3 className="text-base font-semibold text-slate-100">Estado de la sesión</h3>
        <ul className="mt-3 space-y-2">
          <li>
            <span className="font-medium text-slate-200">Usuario:</span> {session?.user.email}
          </li>
          <li>
            <span className="font-medium text-slate-200">Rol:</span> {session?.user.role}
          </li>
          <li>
            <span className="font-medium text-slate-200">Acceso:</span> Tokens rotados automáticamente con refresh seguro.
          </li>
        </ul>
      </section>
    </div>
  );
}

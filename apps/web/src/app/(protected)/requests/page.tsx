const checklist = [
  'Solicitudes pendientes por vencer',
  'Evidencia cargada por clientes',
  'Historial de comentarios y aprobaciones parciales',
];

export default function RequestsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200/80">Solicitudes</p>
        <h1 className="text-2xl font-semibold text-slate-100">Gestiona la información crítica</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Esta vista presentará la cola de solicitudes de información conectada al backend. Desde Sprint F2 se integrará con el
          wizard y con la subida de archivos.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-base font-semibold text-slate-100">Panel operativo próximo</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-400">
          {checklist.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-400/60 text-[11px] font-semibold text-blue-200">
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
        <p>
          La autenticación ya está lista, por lo que cualquier dato que aparezca aquí respetará los permisos de membresía definidos
          en el backend. Los próximos sprints conectarán este layout con componentes dinámicos y workflows aprobatorios.
        </p>
      </section>
    </div>
  );
}

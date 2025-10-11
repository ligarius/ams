const roadmap = [
  'Registro de aprobaciones vinculadas a proyectos',
  'Notificación a comités y registro de comentarios',
  'Historial trazable con vínculos a riesgos y solicitudes',
];

export default function ApprovalsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200/80">Aprobaciones</p>
        <h1 className="text-2xl font-semibold text-slate-100">Control de cambios de alcance</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Esta sección hospedará el flujo de aprobaciones conectado al backend. El sprint actual deja el layout preparado para
          integrar las transiciones de estado y notificaciones en próximos incrementos.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-base font-semibold text-slate-100">Roadmap inmediato</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-400">
          {roadmap.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-400/60 text-[11px] font-semibold text-blue-200">
                ↻
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
        <p>
          Las rutas protegidas ya verifican la sesión, por lo que los futuros tableros de aprobaciones respetarán los permisos de
          comité y consultores establecidos en el backend.
        </p>
      </section>
    </div>
  );
}

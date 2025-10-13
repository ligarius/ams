import Image from "next/image";
import type { ReactNode } from "react";

type Highlight = {
  title: string;
  description: string;
  icon: ReactNode;
};

const iconClasses = "h-5 w-5 text-cyan-600";

const highlights: Highlight[] = [
  {
    icon: (
      <svg className={iconClasses} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 3 4.5 6v6c0 4.308 3.053 8.576 7.5 9 4.447-.424 7.5-4.692 7.5-9V6L12 3Z"
          fill="currentColor"
          fillOpacity="0.7"
        />
        <path
          d="m9.75 12.75 1.5 1.5 3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Seguridad certificada",
    description: "Cifrado AES-256, MFA obligatorio y auditorías continuas",
  },
  {
    icon: (
      <svg className={iconClasses} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M4 5.5h16M4 12h10M4 18.5h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="12" r="3" fill="currentColor" fillOpacity="0.65" />
        <circle cx="14" cy="18.5" r="2" fill="currentColor" fillOpacity="0.45" />
      </svg>
    ),
    title: "KPI en tiempo real",
    description: "Monitorea riesgos, hallazgos y aprobaciones sin salir del dashboard",
  },
  {
    icon: (
      <svg className={iconClasses} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 3.5v3M7 5.5l1.5 2.6M17 5.5l-1.5 2.6M5 12h3M16 12h3M7 18.5l1.5-2.6M17 18.5l-1.5-2.6M12 17.5v3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.55" />
      </svg>
    ),
    title: "Automatización inteligente",
    description: "Orquesta recordatorios, flujos de revisión y reportes regulatorios",
  },
];

export function LoginHero() {
  return (
    <div className="flex flex-col gap-12">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
        <span className="h-2 w-2 rounded-full bg-cyan-500" />
        Plataforma AMS
      </div>

      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Auditoría moderna con trazabilidad total
        </h1>
        <p className="text-base text-slate-600 sm:text-lg">
          Centraliza equipos, proyectos y controles en una única experiencia colaborativa, diseñada para cumplir normativas y
          acortar cierres de auditoría.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {highlights.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-200"
          >
            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600" aria-hidden>
              {item.icon}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Image src="/brand/ams-glyph.svg" alt="AMS" width={40} height={40} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Confianza Fortune 500</p>
          <p className="text-sm text-slate-600">+120 empresas reguladas operan auditorías críticas en AMS.</p>
        </div>
      </div>
    </div>
  );
}

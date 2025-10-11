'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/components/session-provider';

const links = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/projects', label: 'Proyectos' },
  { href: '/requests', label: 'Solicitudes' },
  { href: '/approvals', label: 'Aprobaciones' },
];

export function Navigation() {
  const { user } = useSession();
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-700/50 bg-slate-900/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-sm text-slate-200">
        <div className="flex items-center gap-4">
          <span className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">
            AMS
          </span>
          <nav className="flex items-center gap-4">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 transition ${
                    isActive ? 'bg-blue-500/20 text-blue-200' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Sesión activa</p>
            <p className="text-sm font-medium text-slate-100">{user.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-blue-400 hover:text-blue-200"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

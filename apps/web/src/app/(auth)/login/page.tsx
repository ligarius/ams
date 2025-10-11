import Link from 'next/link';
import { ensureSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';

export default async function LoginPage() {
  const session = await ensureSession();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-700/40 bg-slate-900/70 p-10 shadow-2xl shadow-blue-500/10 backdrop-blur">
        <div className="space-y-2 text-center">
          <span className="inline-flex items-center rounded-full border border-blue-400/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-200/80">
            Sprint F1
          </span>
          <h1 className="text-3xl font-semibold text-slate-100">Bienvenido a AMS</h1>
          <p className="text-sm text-slate-400">
            Inicia sesión para acceder a tus proyectos y solicitudes de auditoría.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-slate-500">
          ¿Necesitas ayuda? <Link href="#" className="text-blue-300 hover:text-blue-200">Contacta al administrador</Link>
        </p>
      </div>
    </div>
  );
}

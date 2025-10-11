import Link from "next/link";
import { LoginHero } from "../../../components/login-hero";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100 md:grid md:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-grid pattern absolute inset-0" aria-hidden />
        <div className="login-halo absolute left-1/2 top-[10%] h-[540px] w-[540px] -translate-x-1/2 md:left-[62%]" aria-hidden />
      </div>

      <div className="relative z-10 flex items-center justify-center px-6 py-12 sm:px-12 md:justify-start">
        <div className="w-full max-w-xl">
          <LoginHero />
        </div>
      </div>

      <section className="relative z-10 flex items-center justify-center px-6 pb-16 pt-8 sm:px-12 md:px-16 md:py-12">
        <div className="login-card relative w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
            <header className="mb-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Ingresa a tu cuenta</h1>
              <p className="mt-2 text-sm text-slate-200/70">
                Administra auditorías, proyectos y hallazgos desde un solo lugar.
              </p>
            </header>

            <form className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-100" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-cyan-400/60"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-100" htmlFor="password">
                    Contraseña
                  </label>
                  <Link href="#" className="text-xs font-medium text-cyan-300 transition hover:text-cyan-200">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-cyan-400/60"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-200/70">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/10 text-cyan-300 focus:ring-cyan-300" />
                  Recuérdame
                </label>
                <span>Protegido con MFA</span>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-cyan-300 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-400"
              >
                Iniciar sesión
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-200/70">
              ¿No tienes una cuenta? {" "}
              <Link href="#" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
                Solicita acceso
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

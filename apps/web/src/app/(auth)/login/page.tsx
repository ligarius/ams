import Link from "next/link";
import { LoginHero } from "../../../components/login-hero";
import { LoginForm } from "../../../components/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12 sm:py-16 lg:grid lg:grid-cols-[minmax(0,1fr),minmax(0,420px)] lg:items-center lg:gap-20 lg:py-24">
        <section className="flex flex-col gap-12">
          <LoginHero />
        </section>

        <section className="w-full">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
            <header className="mb-8 space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">Ingresa a tu cuenta</h1>
              <p className="text-sm text-slate-600">Administra auditorías, proyectos y hallazgos desde un solo lugar.</p>
            </header>

            <LoginForm />

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <Link href="#" className="font-medium text-cyan-600 transition hover:text-cyan-500">
                ¿Olvidaste tu contraseña?
              </Link>
              <span>Protegido con MFA</span>
            </div>

            <p className="mt-8 text-center text-sm text-slate-600">
              ¿No tienes una cuenta? {" "}
              <Link href="#" className="font-semibold text-cyan-600 transition hover:text-cyan-500">
                Solicita acceso
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

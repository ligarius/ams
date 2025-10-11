'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setServerError(body?.message ?? 'No se pudo iniciar sesión.');
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="email">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-md border border-slate-600 bg-slate-900/60 px-3 py-2 text-slate-100 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          placeholder="tucuenta@empresa.com"
          {...register('email')}
        />
        {errors.email && <p className="text-sm text-rose-300">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-md border border-slate-600 bg-slate-900/60 px-3 py-2 text-slate-100 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          placeholder="Ingresa tu contraseña"
          {...register('password')}
        />
        {errors.password && <p className="text-sm text-rose-300">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-rose-300">{serverError}</p>}

      <button
        type="submit"
        className="flex w-full items-center justify-center rounded-md bg-blue-500 px-4 py-2 font-medium text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-blue-900"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

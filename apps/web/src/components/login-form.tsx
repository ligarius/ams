'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';

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
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={3}>
        <TextField
          id="email"
          type="email"
          label="Correo electrónico"
          autoComplete="email"
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          fullWidth
          {...register('email')}
        />

        <TextField
          id="password"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
          fullWidth
          {...register('password')}
        />

        {serverError && (
          <Alert severity="error" variant="outlined">
            {serverError}
          </Alert>
        )}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
          {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <MuiLink component={NextLink} href="#" variant="body2">
            ¿Olvidaste tu contraseña?
          </MuiLink>
          <Typography variant="caption" color="text.secondary">
            Protegido con MFA
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          ¿No tienes una cuenta?{' '}
          <MuiLink component={NextLink} href="#" fontWeight={600} color="primary">
            Solicita acceso
          </MuiLink>
        </Typography>
      </Stack>
    </Box>
  );
}

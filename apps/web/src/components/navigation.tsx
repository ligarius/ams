'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { AppBar, Box, Button, Chip, Stack, Toolbar, Typography } from '@mui/material';
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
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        backdropFilter: 'blur(12px)',
        bgcolor: 'rgba(255,255,255,0.9)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', maxWidth: '1100px', width: '100%', mx: 'auto', py: 1.5 }}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Chip label="AMS" color="primary" variant="outlined" sx={{ letterSpacing: '0.3em', fontWeight: 700 }} />
          <Stack direction="row" spacing={1.5}>
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Button
                  key={link.href}
                  component={NextLink}
                  href={link.href}
                  variant={isActive ? 'contained' : 'text'}
                  color={isActive ? 'primary' : 'inherit'}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.16em' }}>
              Sesión activa
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {user.email}
            </Typography>
          </Box>
          <Box component="form" action="/api/auth/logout" method="post">
            <Button type="submit" variant="outlined" size="small">
              Cerrar sesión
            </Button>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

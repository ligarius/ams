import NextLink from 'next/link';
import { ensureSession } from '@/lib/auth/session';
import {
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

const cards = [
  {
    title: 'Proyectos activos',
    description: 'Visualiza el estado de cada auditoría y sus próximos hitos.',
    href: '/projects',
  },
  {
    title: 'Solicitudes pendientes',
    description: 'Gestiona entregables y revisa archivos de soporte.',
    href: '/requests',
  },
  {
    title: 'Aprobaciones',
    description: 'Controla los cambios de alcance y mantén a los comités informados.',
    href: '/approvals',
  },
];

export default async function DashboardPage() {
  const session = await ensureSession();
  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
          Inicio
        </Typography>
        <Typography variant="h4">
          Hola, {session?.user.email ?? 'consultor'}
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={560}>
          Este panel concentra las actividades clave del sprint: autenticación segura, layout protegido y navegación principal.
          Desde aquí podrás saltar rápidamente a cada módulo operativo.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item key={card.href} xs={12} sm={6} lg={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                height: '100%',
                transition: 'transform 120ms ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
            >
              <CardActionArea component={NextLink} href={card.href} sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="h6">{card.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>
                    <Typography variant="caption" color="primary.main" sx={{ letterSpacing: '0.3em', fontWeight: 700 }}>
                      Explorar →
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Typography variant="h6" gutterBottom>
          Estado de la sesión
        </Typography>
        <Stack spacing={1.5} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          <Typography component="li" variant="body2">
            <Typography component="span" fontWeight={600}>
              Usuario:
            </Typography>{' '}
            {session?.user.email}
          </Typography>
          <Typography component="li" variant="body2">
            <Typography component="span" fontWeight={600}>
              Rol:
            </Typography>{' '}
            {session?.user.role}
          </Typography>
          <Typography component="li" variant="body2">
            <Typography component="span" fontWeight={600}>
              Acceso:
            </Typography>{' '}
            Tokens rotados automáticamente con refresh seguro.
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

import type { ElementType } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsIcon from '@mui/icons-material/Insights';
import SecurityIcon from '@mui/icons-material/Security';
import { Avatar, Chip, Divider, Paper, Stack, Typography } from '@mui/material';

type Highlight = {
  title: string;
  description: string;
  icon: ElementType;
};

const highlights: Highlight[] = [
  {
    icon: SecurityIcon,
    title: 'Seguridad certificada',
    description: 'Cifrado AES-256, MFA obligatorio y auditorías continuas.',
  },
  {
    icon: InsightsIcon,
    title: 'KPI en tiempo real',
    description: 'Monitorea riesgos, hallazgos y aprobaciones sin salir del dashboard.',
  },
  {
    icon: AutoAwesomeIcon,
    title: 'Automatización inteligente',
    description: 'Orquesta recordatorios, flujos de revisión y reportes regulatorios.',
  },
];

export function LoginHero() {
  return (
    <Stack spacing={4} component={Paper} elevation={0} sx={{ p: { xs: 4, md: 5 } }}>
      <Stack spacing={2}>
        <Chip
          label="Plataforma AMS"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: 'flex-start', fontWeight: 600, letterSpacing: '0.2em', px: 1.5 }}
        />
        <Typography variant="h4" component="h1">
          Auditoría moderna con trazabilidad total
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Centraliza equipos, proyectos y controles en una experiencia colaborativa diseñada para cumplir normativas y acortar
          cierres de auditoría.
        </Typography>
      </Stack>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Stack spacing={2}>
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <Paper key={item.title} variant="outlined" sx={{ p: 2.5, display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
              <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 44, height: 44 }}>
                <Icon fontSize="small" />
              </Avatar>
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Paper
        variant="outlined"
        sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { sm: 'center' } }}
      >
        <Avatar sx={{ bgcolor: 'secondary.main', color: 'background.paper', width: 56, height: 56, fontWeight: 700 }}>AMS</Avatar>
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" fontWeight={600}>
            Confianza Fortune 500
          </Typography>
          <Typography variant="body2" color="text.secondary">
            +120 empresas reguladas operan auditorías críticas en AMS.
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

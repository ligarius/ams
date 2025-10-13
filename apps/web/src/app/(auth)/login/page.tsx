import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import { LoginHero } from '../../../components/login-hero';
import { LoginForm } from '../../../components/login-form';

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 4, md: 8 }} justifyContent="center" alignItems="stretch">
          <Grid item xs={12} md={6}>
            <LoginHero />
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper elevation={10} sx={{ p: { xs: 4, md: 5 }, borderRadius: 5 }}>
              <Stack spacing={2} textAlign="center">
                <Typography variant="h5" fontWeight={600}>
                  Ingresa a tu cuenta
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Administra auditorías, proyectos y hallazgos desde un solo lugar.
                </Typography>
              </Stack>
              <Box mt={4}>
                <LoginForm />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

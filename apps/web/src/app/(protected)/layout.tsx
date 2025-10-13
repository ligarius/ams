import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/auth/server-session';
import { SessionProvider } from '@/components/session-provider';
import { Navigation } from '@/components/navigation';
import { Box, Container } from '@mui/material';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await fetchServerSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider user={session.user}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navigation />
        <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 8 }, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {children}
        </Container>
      </Box>
    </SessionProvider>
  );
}

import { ensureSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { SessionProvider } from '@/components/session-provider';
import { Navigation } from '@/components/navigation';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await ensureSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider user={session.user}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navigation />
        <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}

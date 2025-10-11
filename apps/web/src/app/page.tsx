import { redirect } from 'next/navigation';
import { ensureSession } from '@/lib/auth/session';

export default async function IndexPage() {
  const session = await ensureSession();
  redirect(session ? '/dashboard' : '/login');
}

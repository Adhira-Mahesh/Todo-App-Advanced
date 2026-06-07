// Server page for /admin — guards the route to ADMIN role only
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth');
  }

  if (session.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <AdminPanel />;
}

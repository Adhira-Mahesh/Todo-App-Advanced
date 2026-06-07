// This is the actual Next.js server page for /dashboard.
// It reads the session server-side and passes user data to the client component.
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Dashboard from './Dashboard';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth');
  }

  return <Dashboard sessionUser={session} />;
}

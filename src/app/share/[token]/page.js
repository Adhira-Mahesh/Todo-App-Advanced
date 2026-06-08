// Public share page — no auth required
import { prisma } from '@/utils/prisma';
import ShareView from './ShareView';

export async function generateMetadata({ params }) {
  const { token } = await params;
  const user = await prisma.user.findUnique({
    where: { shareToken: token },
    select: { name: true, isShareEnabled: true },
  });

  if (!user || !user.isShareEnabled) {
    return { title: 'List Not Available' };
  }

  return {
    title: `${user.name || 'Someone'}'s Focus List`,
    description: `View ${user.name || 'this user'}'s shared todo list`,
  };
}

export default async function SharePage({ params }) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { shareToken: token },
    select: {
      name: true,
      isShareEnabled: true,
      shareEditEnabled: true,
      todos: {
        where: { isDeleted: false, isArchived: false },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          tag: true,
          dueTime: true,
          isCompleted: true,
        },
      },
    },
  });

  // Not found or sharing disabled
  if (!user || !user.isShareEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-on-background">List Not Available</h1>
            <p className="text-on-surface-variant mt-2">This shared list doesn't exist or the owner has disabled sharing.</p>
          </div>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-all"
          >
            Create Your Own List
          </a>
        </div>
      </div>
    );
  }

  const todos = user.todos.map(t => ({
    id: t.id,
    text: t.title,
    tag: t.tag,
    time: t.dueTime,
    completed: t.isCompleted,
  }));

  return (
    <ShareView
      token={token}
      ownerName={user.name || 'Someone'}
      shareEditEnabled={user.shareEditEnabled}
      initialTodos={todos}
    />
  );
}

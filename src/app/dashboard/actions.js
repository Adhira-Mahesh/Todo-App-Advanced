// app/dashboard/actions.js
'use server';

import { prisma } from '@/utils/prisma';
import { getSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

const TAG_COLORS = {
  'Urgent':     'bg-tertiary-container text-on-tertiary-container',
  'Work':       'bg-surface-container-highest text-on-surface-variant',
  'High Focus': 'bg-secondary-container text-on-secondary-container',
  'General':    'bg-surface-container-low text-on-surface-variant',
};

function mapTodo(todo) {
  return {
    id: todo.id,
    text: todo.title,
    time: todo.dueTime,
    tag: todo.tag,
    tagColor: TAG_COLORS[todo.tag] || TAG_COLORS['General'],
    completed: todo.isCompleted,
    isArchived: todo.isArchived,
    isDeleted: todo.isDeleted,
  };
}

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error('Not authenticated');
  return session;
}

/** Fetch all todos for the logged-in user */
export async function getUserTodos() {
  const session = await requireUser();
  const todos = await prisma.todo.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  });
  return todos.map(mapTodo);
}

/** Create a new todo for the logged-in user */
export async function createTodo({ title, tag = 'General', dueTime = 'Today, 5:00 PM' }) {
  const session = await requireUser();
  if (!title?.trim()) return { error: 'Title is required' };

  const todo = await prisma.todo.create({
    data: {
      title: title.trim(),
      tag,
      dueTime,
      userId: session.userId,
    },
  });

  revalidatePath('/dashboard');
  return { success: true, todo: mapTodo(todo) };
}

/** Toggle completion status */
export async function toggleTodo(todoId) {
  const session = await requireUser();
  const todo = await prisma.todo.findFirst({ where: { id: todoId, userId: session.userId } });
  if (!todo) return { error: 'Not found' };

  // Use the same userId filter on update to prevent race-condition privilege escalation
  const updated = await prisma.todo.update({
    where: { id: todoId, userId: session.userId },
    data: { isCompleted: !todo.isCompleted },
  });
  revalidatePath('/dashboard');
  return { success: true, todo: mapTodo(updated) };
}

/** Update task title */
export async function editTodo(todoId, newTitle) {
  const session = await requireUser();
  if (!newTitle?.trim()) return { error: 'Title required' };

  const updated = await prisma.todo.update({
    where: { id: todoId, userId: session.userId },
    data: { title: newTitle.trim() },
  });
  revalidatePath('/dashboard');
  return { success: true, todo: mapTodo(updated) };
}

/** Move to archive / restore from archive */
export async function archiveTodo(todoId, archive = true) {
  const session = await requireUser();
  const updated = await prisma.todo.update({
    where: { id: todoId, userId: session.userId },
    data: { isArchived: archive },
  });
  revalidatePath('/dashboard');
  return { success: true, todo: mapTodo(updated) };
}

/** Soft-delete / restore from trash */
export async function trashTodo(todoId, trash = true) {
  const session = await requireUser();
  const updated = await prisma.todo.update({
    where: { id: todoId, userId: session.userId },
    data: { isDeleted: trash },
  });
  revalidatePath('/dashboard');
  return { success: true, todo: mapTodo(updated) };
}

/** Permanently delete */
export async function deleteTodoPermanently(todoId) {
  const session = await requireUser();
  await prisma.todo.delete({ where: { id: todoId, userId: session.userId } });
  revalidatePath('/dashboard');
  return { success: true };
}

/** Change tag */
export async function changeTodoTag(todoId, tag) {
  const session = await requireUser();
  const updated = await prisma.todo.update({
    where: { id: todoId, userId: session.userId },
    data: { tag },
  });
  revalidatePath('/dashboard');
  return { success: true, todo: mapTodo(updated) };
}

// app/dashboard/shareActions.js
'use server';

import { prisma } from '@/utils/prisma';
import { getSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error('Not authenticated');
  return session;
}

/** Resolves a share token to the owner — throws if invalid or disabled */
async function resolveShareToken(token) {
  const user = await prisma.user.findUnique({
    where: { shareToken: token },
  });
  if (!user || !user.isShareEnabled) {
    throw new Error('Share link is invalid or has been disabled');
  }
  return user;
}

// ─── Owner Actions (session required) ───────────────────────────────────────

/** Get the current share state for the logged-in user */
export async function getShareInfo() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { shareToken: true, isShareEnabled: true, shareEditEnabled: true },
  });
  return {
    isEnabled: user?.isShareEnabled ?? false,
    shareEditEnabled: user?.shareEditEnabled ?? false,
    token: user?.shareToken ?? null,
  };
}

/** Enable sharing — generates a token if one doesn't exist yet */
export async function enableShare() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      isShareEnabled: true,
      // Only generate a new token if one doesn't already exist
      shareToken: user?.shareToken ?? randomUUID(),
    },
  });

  revalidatePath('/dashboard');
  return { success: true };
}

/** Disable sharing — keeps the token so the same link works if re-enabled */
export async function disableShare() {
  const session = await requireUser();
  await prisma.user.update({
    where: { id: session.userId },
    data: { isShareEnabled: false },
  });
  revalidatePath('/dashboard');
  return { success: true };
}

/** Toggle between view-only and edit mode */
export async function setShareEditMode(enabled) {
  const session = await requireUser();
  await prisma.user.update({
    where: { id: session.userId },
    data: { shareEditEnabled: !!enabled },
  });
  revalidatePath('/dashboard');
  return { success: true };
}

/** Invalidate old link and generate a fresh token */
export async function regenerateShareLink() {
  const session = await requireUser();
  const newToken = randomUUID();
  await prisma.user.update({
    where: { id: session.userId },
    data: { shareToken: newToken },
  });
  revalidatePath('/dashboard');
  return { success: true, token: newToken };
}

// ─── Collaborator Actions (token-authenticated, no session required) ─────────

/** Fetch the shared list — works in both view and edit mode */
export async function getSharedTodos(token) {
  const user = await resolveShareToken(token);

  const todos = await prisma.todo.findMany({
    where: {
      userId: user.id,
      isDeleted: false,
      isArchived: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    ownerName: user.name || 'Someone',
    shareEditEnabled: user.shareEditEnabled,
    todos: todos.map(t => ({
      id: t.id,
      text: t.title,
      tag: t.tag,
      time: t.dueTime,
      completed: t.isCompleted,
    })),
  };
}

/** Add a task to the owner's list via share link */
export async function addTaskViaShare(token, title) {
  if (!title?.trim()) return { error: 'Title is required' };

  const user = await resolveShareToken(token);

  if (!user.shareEditEnabled) {
    return { error: 'This list is view-only' };
  }

  const todo = await prisma.todo.create({
    data: {
      title: title.trim(),
      userId: user.id,
      tag: 'General',
      dueTime: 'Today, 5:00 PM',
    },
  });

  return {
    success: true,
    todo: { id: todo.id, text: todo.title, tag: todo.tag, time: todo.dueTime, completed: false },
  };
}

/** Toggle completion on a task via share link */
export async function toggleTaskViaShare(token, taskId) {
  const user = await resolveShareToken(token);

  if (!user.shareEditEnabled) {
    return { error: 'This list is view-only' };
  }

  const todo = await prisma.todo.findFirst({
    where: { id: taskId, userId: user.id, isDeleted: false },
  });
  if (!todo) return { error: 'Task not found' };

  const updated = await prisma.todo.update({
    where: { id: taskId },
    data: { isCompleted: !todo.isCompleted },
  });

  return { success: true, completed: updated.isCompleted };
}

/** Delete a task via share link (soft delete) */
export async function deleteTaskViaShare(token, taskId) {
  const user = await resolveShareToken(token);

  if (!user.shareEditEnabled) {
    return { error: 'This list is view-only' };
  }

  await prisma.todo.update({
    where: { id: taskId, userId: user.id },
    data: { isDeleted: true },
  });

  return { success: true };
}

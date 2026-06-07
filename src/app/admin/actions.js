// app/admin/actions.js
'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

/** Guard: throws if the caller is not an admin */
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
  return session;
}

/** Fetch all users (admin only) */
export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** Add a new user (admin only) */
export async function addUser(formData) {
  await requireAdmin();

  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');
  const role = formData.get('role') || 'USER';

  if (!email || !password) return { error: 'Email and password are required' };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: 'Email already registered' };

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, password: hashedPassword, role },
  });

  revalidatePath('/admin');
  return { success: 'User created successfully' };
}

/** Delete a user by ID (admin only) */
export async function deleteUser(userId) {
  const session = await requireAdmin();

  // Prevent admin from deleting themselves
  if (session.userId === userId) {
    return { error: "You can't delete your own account" };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin');
  return { success: 'User deleted' };
}

/** Update a user's role (admin only) */
export async function updateUserRole(userId, role) {
  const session = await requireAdmin();

  if (!['ADMIN', 'USER'].includes(role)) {
    return { error: 'Invalid role' };
  }

  // Prevent admin from changing their own role
  if (session.userId === userId) {
    return { error: "You can't change your own role" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath('/admin');
  return { success: `Role updated to ${role}` };
}

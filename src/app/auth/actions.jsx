// app/auth/actions.js
'use server';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession } from '@/lib/session';

const prisma = new PrismaClient();

export async function registerUser(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { error: "Missing required fields" };
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: "Email already registered" };

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    return { success: "Account created successfully!" };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong. Try again." };
  }
}

export async function loginUser(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { error: 'User not found' };
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return { error: 'Incorrect password' };
  }

  // Create JWT session cookie
  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  redirect('/dashboard');
}

export async function logoutUser() {
  await deleteSession();
  redirect('/auth');
}
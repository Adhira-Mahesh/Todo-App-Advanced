// app/login/actions.js
'use server';
import { redirect } from 'next/navigation';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function registerUser(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { error: "Missing required fields" };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: "Email already registered" };

    // Hash the password safely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to PostgreSQL via Prisma
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { success: "Account created successfully!" };
  } catch (error) {
    return { error: "Something went wrong. Try again." };
  }
}

export async function loginUser(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: 'User not found' };
  }

  const isValid = await bcrypt.compare(
    password,
    user.password
  );

  if (!isValid) {
    return { error: 'Incorrect password' };
  }
if (isValid) {
  redirect('/');
}
  return { success: 'Login successful!' };
}
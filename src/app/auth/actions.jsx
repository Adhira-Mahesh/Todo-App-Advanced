// app/auth/actions.js
'use server';
import { redirect } from 'next/navigation';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession } from '@/lib/session';

// In-memory registry for password reset codes (email -> { code, expires })
const resetCodes = new Map();

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

  if (!email || !password) {
    return { error: 'Missing email or password' };
  }

  try {
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
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Something went wrong. Please try again.' };
  }

  // redirect() must be called outside try/catch (it throws internally)
  redirect('/dashboard');
}

export async function logoutUser() {
  await deleteSession();
  redirect('/auth');
}

export async function requestPasswordReset(email) {
  if (!email) {
    return { error: "Email is required" };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { error: "User not found with this email" };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000; // 15 mins expiry
    
    resetCodes.set(email.toLowerCase(), { code, expires });
    
    console.log("==========================================");
    console.log(`[PASSWORD RESET CODE] For ${email}: ${code}`);
    console.log("==========================================");

    return { success: "Password reset code generated. Check server console logs." };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function verifyResetCodeAndResetPassword(email, code, newPassword) {
  if (!email || !code || !newPassword) {
    return { error: "All fields are required" };
  }

  try {
    const key = email.toLowerCase();
    const record = resetCodes.get(key);
    
    if (!record) {
      return { error: "No reset request found for this email" };
    }

    if (record.expires < Date.now()) {
      resetCodes.delete(key);
      return { error: "Reset code has expired" };
    }

    if (record.code !== code.trim()) {
      return { error: "Invalid reset code" };
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Clean up code
    resetCodes.delete(key);

    return { success: "Password reset successful! You can now sign in." };
  } catch (error) {
    console.error("Password reset verification error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
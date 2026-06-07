import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-secret-please-change-in-production-32ch'
);

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { userId: string; role: string; email: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard — must be logged in
  if (pathname.startsWith('/dashboard')) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  // Protect /admin — must be logged in AND be ADMIN
  if (pathname.startsWith('/admin')) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Redirect authenticated users away from /auth to /dashboard
  if (pathname === '/auth') {
    const session = await getSessionFromRequest(request);
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth'],
};

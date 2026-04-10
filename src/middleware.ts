import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware is kept minimal - auth is handled by AuthGuard component
  return NextResponse.next();
}

export const config = {
  matcher: [],
}; 
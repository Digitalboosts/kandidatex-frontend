import { NextResponse, type NextRequest } from 'next/server';

/**
 * Sends signed-out visitors to the login page. This is only a convenience: it
 * can't verify the token, and every piece of data is protected by the backend.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has('im_session')) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/interviews/:path*', '/recordings/:path*', '/alerts/:path*', '/billing/:path*'] };

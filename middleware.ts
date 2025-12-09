/**
 * Middleware - Protects routes requiring authentication
 * Redirects unauthenticated users to landing page
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isLanding = request.nextUrl.pathname === '/landing';
  const isRoot = request.nextUrl.pathname === '/';
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin');

  // If not authenticated and trying to access protected routes
  if (!session && !isAuthPage && !isLanding) {
    const url = request.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.redirect(url);
  }

  // If authenticated and trying to access auth pages or landing
  if (session && (isAuthPage || isLanding || isRoot)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Check admin access
  if (isAdminPage && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

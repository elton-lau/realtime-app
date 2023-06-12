import { getToken } from 'next-auth/jwt';
import withAuth from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  async function middleware(req) {
    const pathname = req.nextUrl.pathname;
    
    // manage route protection
    const isAuth = await getToken({req})
    const isLoginPage = pathname.startsWith('/login')
    if (isLoginPage && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    const isProtectedRoute = ['/dashboard']
    const isAccessProtectedRoute = isProtectedRoute.some(route => pathname.startsWith(route))
    if (!isAuth && isAccessProtectedRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  }, {
    callbacks: {
      async authorized() {
        return true
      } 
    }
  }
)

export const config = {
  matcher:['/', '/login', '/dashboard/:path*']
}
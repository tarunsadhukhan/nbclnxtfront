// middleware.ts (Edge Middleware for Tenant + Auth Validation)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Ensure this has full absolute URLs, not relative
import {apiRoutes} from './utils/api'; // Ensure this has full absolute URLs, not relative
import { determinePortalAction } from './utils/portalPermissions';


const PROTECTED_PATHS = ['/dashboardctrldesk', '/dashboardadmin', '/dashboardportal', '/reset-password'];
const PUBLIC_PATHS = ['/', '/login', '/_next', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const accessToken = request.cookies.get('access_token');
  const permissionToken = request.cookies.get('portal_permission_token');
  const pathname = url.pathname;

  // Extract subdomain from hostname
  const subdomain = hostname.includes('.localhost:3000')
    ? hostname.split('.localhost:3000')[0]
    : hostname.split('.')[0];

  // Subdomain validation is handled client-side by SubdomainGuard component
  // (validates against con_org_master via /authRoutes/validate-subdomain API)

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Handle protected paths
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
    if (!accessToken?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const cookieHeader = [
      accessToken?.value ? `access_token=${accessToken.value}` : null,
      permissionToken?.value ? `portal_permission_token=${permissionToken.value}` : null,
    ].filter(Boolean).join('; ');

    try {
      // Edge-compatible fetch, manually forwarding cookie
      const verifyRes = await fetch(apiRoutes.VERIFYSESSION, {
        method: 'GET',
        headers: {
          ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
        },
      });

      if (!verifyRes.ok) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const data = await verifyRes.json();
      if (!data.ok) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (pathname.startsWith('/dashboardportal')) {
      try {
        const action = determinePortalAction(pathname, url.search);
        const permissionRes = await fetch(apiRoutes.PORTAL_MENU_PERMISSION_CHECK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
          },
          body: JSON.stringify({ path: pathname, action }),
        });

        if (permissionRes.status === 401 || permissionRes.status === 403) {
          return NextResponse.redirect(new URL('/login', request.url));
        }

        if (!permissionRes.ok) {
          return NextResponse.redirect(new URL('/dashboardportal', request.url));
        }

        const permissionPayload = await permissionRes.json();
        if (!permissionPayload?.allowed) {
          return NextResponse.redirect(new URL('/dashboardportal', request.url));
        }
      } catch (err) {
        return NextResponse.redirect(new URL('/dashboardportal', request.url));
      }
    }
  }

  // Optional: persist subdomain as cookie
  const response = NextResponse.next();
  response.cookies.set('subdomain', subdomain, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });

  return response;
}

export const config = {
  matcher: ['/:path*'],
};

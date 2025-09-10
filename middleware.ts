import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/lib/auth/config';
import type { UserRole } from '@/types/user';

// Define route protection rules
interface RouteConfig {
  requiredRole: UserRole | null;
  isPublic: boolean;
  redirectTo?: string;
  allowedRoles?: UserRole[];
}

const routeProtection: Record<string, RouteConfig> = {
  // Public routes
  '/': { requiredRole: null, isPublic: true },
  '/login': { requiredRole: null, isPublic: true },
  '/register': { requiredRole: null, isPublic: true },
  '/auth/error': { requiredRole: null, isPublic: true },
  '/auth/verify-request': { requiredRole: null, isPublic: true },
  '/auth/forgot-password': { requiredRole: null, isPublic: true },
  '/auth/reset-password': { requiredRole: null, isPublic: true },
  
  // Reader level routes
  '/dashboard': { requiredRole: 'reader', isPublic: false },
  '/stories': { requiredRole: 'reader', isPublic: false },
  '/profile': { requiredRole: 'reader', isPublic: false },
  '/settings': { requiredRole: 'reader', isPublic: false },
  
  // Writer level routes
  '/write': { requiredRole: 'writer', isPublic: false },
  '/collaborate': { requiredRole: 'writer', isPublic: false },
  '/cycles': { requiredRole: 'writer', isPublic: false },
  '/stories/create': { requiredRole: 'writer', isPublic: false },
  '/stories/edit': { requiredRole: 'writer', isPublic: false },
  
  // Moderator level routes
  '/admin': { requiredRole: 'moderator', isPublic: false },
  '/admin/users': { requiredRole: 'moderator', isPublic: false },
  '/admin/stories': { requiredRole: 'moderator', isPublic: false },
  '/admin/reports': { requiredRole: 'moderator', isPublic: false },
  '/moderation': { requiredRole: 'moderator', isPublic: false },
};

// API route protection
const apiRouteProtection: Record<string, RouteConfig> = {
  // Public API routes
  '/api/auth': { requiredRole: null, isPublic: true },
  '/api/health': { requiredRole: null, isPublic: true },
  
  // Reader API routes
  '/api/stories': { requiredRole: 'reader', isPublic: false },
  '/api/profile': { requiredRole: 'reader', isPublic: false },
  '/api/user': { requiredRole: 'reader', isPublic: false },
  
  // Writer API routes
  '/api/write': { requiredRole: 'writer', isPublic: false },
  '/api/collaborate': { requiredRole: 'writer', isPublic: false },
  '/api/cycles': { requiredRole: 'writer', isPublic: false },
  
  // Moderator API routes
  '/api/admin': { requiredRole: 'moderator', isPublic: false },
  '/api/moderation': { requiredRole: 'moderator', isPublic: false },
};

// Custom middleware function
async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');
  const isAuthRoute = pathname.startsWith('/api/auth');
  
  // Get user session
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // For API routes
  if (isApiRoute) {
    // Skip middleware for NextAuth API routes
    if (isAuthRoute) {
      return NextResponse.next();
    }

    return handleApiRoute(request, token);
  }

  // For regular routes
  return handlePageRoute(request, token);
}

async function handleApiRoute(request: NextRequest, token: any) {
  const { pathname } = request.nextUrl;
  
  // Find matching API route protection rule
  let routeConfig: RouteConfig | null = null;
  
  // Check for exact match first
  if (apiRouteProtection[pathname]) {
    routeConfig = apiRouteProtection[pathname];
  } else {
    // Check for prefix matches
    for (const route in apiRouteProtection) {
      if (pathname.startsWith(route)) {
        routeConfig = apiRouteProtection[route];
        break;
      }
    }
  }

  // If no specific rule found, require authentication
  if (!routeConfig) {
    routeConfig = { requiredRole: 'reader', isPublic: false };
  }

  // Allow public API routes
  if (routeConfig.isPublic) {
    return NextResponse.next();
  }

  // Check authentication for protected API routes
  if (!token?.id) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  // Check role-based access
  if (routeConfig.requiredRole && token.role) {
    const hasAccess = hasPermission(token.role, routeConfig.requiredRole);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
  }

  // Add user context to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', token.id);
  requestHeaders.set('x-user-role', token.role || 'reader');
  requestHeaders.set('x-user-email', token.email || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

async function handlePageRoute(request: NextRequest, token: any) {
  const { pathname } = request.nextUrl;
  
  // Handle redirect for already authenticated users trying to access auth pages
  if (token?.id && ['/login', '/register'].includes(pathname)) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Find matching route protection rule
  let routeConfig: RouteConfig | null = null;
  
  // Check for exact match first
  if (routeProtection[pathname]) {
    routeConfig = routeProtection[pathname];
  } else {
    // Check for prefix matches (for dynamic routes)
    for (const route in routeProtection) {
      if (pathname.startsWith(route) && route !== '/') {
        routeConfig = routeProtection[route];
        break;
      }
    }
  }

  // If no specific rule found and not root, require authentication
  if (!routeConfig && pathname !== '/') {
    routeConfig = { requiredRole: 'reader', isPublic: false };
  }

  // Allow public routes
  if (!routeConfig || routeConfig.isPublic) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (!token?.id) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  if (routeConfig.requiredRole && token.role) {
    const hasAccess = hasPermission(token.role, routeConfig.requiredRole);
    
    if (!hasAccess) {
      // Redirect to appropriate page based on user role
      let redirectPath = '/dashboard';
      
      if (token.role === 'reader') {
        redirectPath = '/dashboard';
      } else if (token.role === 'writer') {
        redirectPath = '/write';
      } else if (token.role === 'moderator') {
        redirectPath = '/admin';
      }

      const redirectUrl = new URL(redirectPath, request.url);
      redirectUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Add user context to request headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', token.id);
  requestHeaders.set('x-user-role', token.role || 'reader');
  requestHeaders.set('x-user-email', token.email || '');
  requestHeaders.set('x-user-name', `${token.firstName || ''} ${token.lastName || ''}`.trim());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Enhanced matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

// Use NextAuth middleware with our custom logic
export default withAuth(middleware, {
  callbacks: {
    // Only run middleware if user is not on a public route
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;
      const isPublicRoute = routeProtection[pathname]?.isPublic || 
                          pathname.startsWith('/api/auth') ||
                          pathname === '/';
      
      // Allow access to public routes
      if (isPublicRoute) return true;
      
      // Require token for protected routes
      return !!token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// Utility function to get route configuration (for use in components)
export function getRouteConfig(pathname: string): RouteConfig | null {
  return routeProtection[pathname] || null;
}

// Utility function to check if a route is accessible for a role
export function isRouteAccessible(pathname: string, userRole: UserRole): boolean {
  const config = routeProtection[pathname];
  
  if (!config) {
    return false; // Unknown routes require authentication
  }

  if (config.isPublic) {
    return true; // Public routes are accessible to everyone
  }

  if (!config.requiredRole) {
    return true; // No specific role required, just authentication
  }

  return hasPermission(userRole, config.requiredRole);
}

// Utility function for client-side route validation
export function validateRouteAccess(
  pathname: string, 
  userRole?: UserRole
): { canAccess: boolean; redirectTo?: string; reason?: string } {
  const config = routeProtection[pathname];
  
  if (!config) {
    return {
      canAccess: false,
      redirectTo: '/login',
      reason: 'Route not found or requires authentication'
    };
  }

  if (config.isPublic) {
    return { canAccess: true };
  }

  if (!userRole) {
    return {
      canAccess: false,
      redirectTo: '/login',
      reason: 'Authentication required'
    };
  }

  if (config.requiredRole && !hasPermission(userRole, config.requiredRole)) {
    const redirectPaths: Record<UserRole, string> = {
      reader: '/dashboard',
      writer: '/write',
      moderator: '/admin',
    };

    return {
      canAccess: false,
      redirectTo: redirectPaths[userRole],
      reason: 'Insufficient permissions'
    };
  }

  return { canAccess: true };
}
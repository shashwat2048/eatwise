import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';
import { signToken } from '@/services/jwt';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/webhooks(.*)',
  '/',
  '/analyze(.*)',
  '/api/graphql(.*)',
  '/api/analyze(.*)',
  '/eatwise-ai-PRO(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  const res = NextResponse.next();
  const userId = (auth as any).userId ?? undefined;

  if (userId) {
    const token = signToken({ id: userId }) ?? undefined;
    if (token) {
      res.cookies.set('token', token);
    }

    // Redirect to /profile if profile is not completed
    const url = new URL(req.url);
    const pathname = url.pathname;
    const skipPaths = ['/profile', '/api', '/sign-in'];
    const shouldSkip = skipPaths.some(p => pathname.startsWith(p));
    if (!shouldSkip) {
      try {
        const endpoint = `${url.protocol}//${url.host}/api/graphql`;
        const client = new GraphQLClient(endpoint, {
          headers: { cookie: req.headers.get('cookie') || '' },
        });
        const GET_PROFILE = gql`query{ getProfile { name } }`;
        const data = await client.request<{ getProfile: { name?: string | null } | null }>(GET_PROFILE);
        if (!data.getProfile) {
          return NextResponse.redirect(new URL('/profile', req.url));
        }
      } catch {}
    }
  } else {
    res.cookies.delete('token');
  }

  return res;
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
  ],
};



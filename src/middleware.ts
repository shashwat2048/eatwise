import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';


const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/webhooks(.*)',
  '/api/graphql(.*)',
  '/',
  '/sitemap.xml',
  '/robots.txt',
  '/google(.*)', // Google verification files like googleXXXX.html
])

const isBot = (req: Request) => {
  const userAgent = (req.headers.get('user-agent') || '').toLowerCase();
  const bots = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'sogou',
    'exabot',
    'facebot',
    'facebookexternalhit',
    'twitterbot',
    'whatsapp',
    'telegrambot',
    'discordbot',
  ];
  return bots.some(bot => userAgent.includes(bot));
}

export default clerkMiddleware(async (auth, req) => {
  if (isBot(req)) {
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
  ],
};



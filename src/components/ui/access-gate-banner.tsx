"use client";
import { useEffect, useState } from "react";

type Quota = { role: string; used: number; max: number; remaining: number; unlimited: boolean };

export default function AccessGateBanner() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const query = `query { myQuota { role used max remaining unlimited } }`;
        const res = await fetch('/api/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query }) });
        const json = await res.json();
        const q = json?.data?.myQuota || null;
        if (mounted) setQuota(q);
      } catch {
        if (mounted) setQuota(null);
      }
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => { setMounted(true); }, []);

  if (quota && quota.role === 'pro') return null;
  const title = quota ? (quota.role === 'free' ? 'Free' : quota.role) : 'Free';
  const desc = quota ? (quota.role === 'free' ? '10 analyses included. Upgrade anytime for unlimited.' : '') : '';
  const badge = quota ? `${quota.remaining} of ${quota.max} left` : '';

  // Force Upgrade CTA to Pro page
  const ctaLabel = 'Upgrade';
  const ctaHref = '/eatwise-ai-PRO';

  return (
    <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-3 sm:p-4 flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{title} plan</div>
        <div className="text-xs text-neutral-600 dark:text-neutral-300">{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        <span suppressHydrationWarning className="hidden sm:inline text-xs rounded-md border px-2 py-1">{badge}</span>
        <a href={ctaHref} className="px-3 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 text-sm">{ctaLabel}</a>
      </div>
    </div>
  );
}



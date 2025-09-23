"use client";
import { useEffect, useState } from "react";
import { canGuestAnalyze, getRemainingAnalyses, MAX_FREE_ANALYSES } from "@/lib/guest";

type Quota = { role: string; used: number; max: number; remaining: number; unlimited: boolean };

export default function AccessGateBanner() {
  const [quota, setQuota] = useState<Quota | null>(null);

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

  let title = "Guest";
  let desc = `Enjoy ${MAX_FREE_ANALYSES} free analyses—no account needed.`;
  let badge = `${getRemainingAnalyses()} of ${MAX_FREE_ANALYSES} left`;
  if (quota) {
    if (quota.role === 'pro') {
      title = 'Pro';
      desc = 'Unlimited analyses. Thank you for supporting EatWise.';
      badge = 'Unlimited';
    } else if (quota.role === 'free') {
      title = 'Free';
      desc = '10 analyses included. Upgrade anytime for unlimited.';
      badge = `${quota.remaining} of ${quota.max} left`;
    }
  }

  const canAnalyze = quota ? (quota.unlimited || quota.remaining > 0) : canGuestAnalyze().ok;
  const ctaLabel = quota?.role === 'pro' ? 'Analyze' : (canAnalyze ? 'Analyze' : 'Upgrade to Pro');
  const ctaHref = canAnalyze ? '/analyze' : '/profile';

  return (
    <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-3 sm:p-4 flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{title} plan</div>
        <div className="text-xs text-neutral-600 dark:text-neutral-300">{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs rounded-md border px-2 py-1">{badge}</span>
        <a href={ctaHref} className="px-3 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 text-sm">{ctaLabel}</a>
      </div>
    </div>
  );
}



"use client";
import { useMemo, useState, useEffect } from "react";
import gql from "graphql-tag";
import { GraphQLClient } from "graphql-request";
import { toast } from "sonner";
import { useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Check, Crown, Sparkles } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

export default function ProUpgradePage() {
  const client = useMemo(() => new GraphQLClient("/api/graphql", { credentials: "include" }), []);
  const [role, setRole] = useState<'guest'|'free'|'pro'>('guest');
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    (async () => {
      try {
        const q = gql`query { myQuota { role unlimited } }`;
        const res = await client.request<{ myQuota?: { role?: string; unlimited?: boolean } }>(q);
        const r = res?.myQuota?.role || (isSignedIn ? 'free' : 'guest');
        setRole(r === 'pro' ? 'pro' : r === 'free' ? 'free' : 'guest');
      } catch {}
    })();
  }, [client, isSignedIn]);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const up = sp.get('upgrade');
      if (up === 'success') toast.success('Payment successful. You are now on Pro.');
      if (up === 'cancelled') toast('Checkout cancelled');
    } catch {}
  }, []);

  function goToPaymentLink() {
    const base = 'https://buy.stripe.com/test_8x28wOfo6bUccwse4h6Na00';
    try {
      const url = new URL(base);
      if (userId) url.searchParams.set('client_reference_id', userId);
      const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';
      if (email) url.searchParams.set('prefilled_email', email);
      window.location.href = url.toString();
    } catch {
      window.location.href = base;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Promo ribbon */}
      <div className="flex items-center justify-center rounded-xl border mb-4 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-[11px] sm:text-xs text-teal-800 dark:text-teal-200">
        Use coupon code <span className="font-semibold">&nbsp;EATWISE100&nbsp;</span> at checkout to get <span className="font-semibold">100% off</span>.
      </div>

      {/* Glowing bordered card */}
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-teal-500/50 via-emerald-500/50 to-cyan-500/50">
        <div className="rounded-2xl border backdrop-blur bg-white/70 dark:bg-black/40 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">EatWise Pro</h1>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-5">One-time purchase. Unlock unlimited analyses and premium features.</p>

          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            <div className="rounded-xl border p-4 bg-white/80 dark:bg-black/40 flex items-center justify-center">
              <Image src="/eatwisePRO.png" alt="EatWise Pro" width={420} height={280} className="w-full h-auto" />
            </div>
            <ul className="space-y-3 text-sm">
              {[
                'Unlimited analyses',
                'Save and access all reports',
                'Faster processing',
                'Priority support',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white"><Check className="h-3 w-3" /></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-600 dark:text-neutral-300">
              {role==='pro' ? 'You are already on Pro.' : isSignedIn ? 'Free plan detected.' : 'Guest mode detected — sign in to upgrade.'}
            </div>
            {role !== 'pro' && (
              <button onClick={goToPaymentLink} disabled={!isSignedIn} className="inline-flex items-center px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                Pay Now
              </button>
            )}
          </div>
          {!isSignedIn && (
            <div className="mt-2 text-[11px] text-red-600">Please sign in to upgrade.</div>
          )}
        </div>
      </div>
    </div>
  );
}



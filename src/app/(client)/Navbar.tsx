"use client";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/ui/theme-toggle-btn";
import { Settings2, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RainbowButton } from "@/components/ui/rainbow-button";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [role, setRole] = useState<'free'|'pro'>('free');
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const q = `query { myQuota { role unlimited } }`;
        const res = await fetch('/api/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) });
        const j = await res.json();
        const r = j?.data?.myQuota?.role as string | undefined;
        if (mounted && r) setRole(r === 'pro' ? 'pro' : 'free');
      } catch {}
    })();
    return () => { mounted = false };
  }, []);
  
  return (
    <header className="sticky top-0 z-50 overflow-visible backdrop-blur-xl supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-black/30 bg-white/50 dark:bg-black/20 border-b border-white/20">
      <div className="mx-auto max-w-6xl px-4 h-14 sm:h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="relative inline-grid place-items-center size-8 rounded-md bg-white/70 dark:bg-black/30">
            <Image src="/EatWise_Logo.png" alt="EatWise" width={30} height={30} className="rounded" />
          </span>
          <span className="sm:inline">EatWise</span>
        </Link>
        <nav className="hidden justify-center sm:flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-primary transition transform duration-200">Home</Link>
          <Link href="/analyze" className="hover:text-primary transition transform duration-200">Analyze</Link>
          <Link href="/reports" className="hover:text-primary transition transform duration-200">Reports</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <ModeToggle />
        {/* Mobile Unlimited Access CTA (replaces dropdown) */}
        {role !== 'pro' && (
          <Link href="/eatwise-ai-PRO" className="sm:hidden">
            <RainbowButton variant="outline" size="sm" className="rounded-md px-3 py-1.5 text-xs">
              <Crown className="h-4 w-4 text-amber-500" />
              Go Pro
            </RainbowButton>
          </Link>
        )}
        {/* Desktop profile text link (only when signed in) */}
        <SignedIn>
          <Link
            href="/profile"
            aria-label="Profile"
            className="hidden sm:inline-block rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            title="Profile"
          >
            Profile
          </Link>
        </SignedIn>
        <SignedOut>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm hover:text-primary transition transform duration-200">Sign In</Link>
          </div>
        </SignedOut>
        <SignedIn>
          {role === 'pro' ? (
            <span title="Pro" className="grid h-9 w-9 place-items-center rounded-md border border-amber-300/60 bg-white/60 dark:bg-black/30">
              <Crown className="h-4 w-4 text-amber-500" />
            </span>
          ) : (
            <Link href="/eatwise-ai-PRO" className="hidden sm:inline-block">
              <RainbowButton variant="outline">Unlimited Access</RainbowButton>
            </Link>
          )}
          <UserButton />
        </SignedIn>
      </div>
      </div>
    </header>
  );
}



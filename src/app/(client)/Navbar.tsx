"use client";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/ui/theme-toggle-btn";
import { Settings2, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/EatWise_Logo.png" alt="EatWise" width={30} height={30} className="rounded" />
          <span className="sm:inline">EatWise</span>
        </Link>
        <nav className="hidden justify-center sm:flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-primary transition transform duration-200">Home</Link>
          <Link href="/analyze" className="hover:text-primary transition transform duration-200">Analyze</Link>
          <Link href="/reports" className="hover:text-primary transition transform duration-200">Reports</Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <ModeToggle />
        {/* Mobile dropdown */}
        <div className="relative sm:hidden z-[1001]">
          <button
            aria-label="Open menu"
            className="h-9 w-9 grid place-items-center rounded-md border hover:bg-accent"
            onClick={() => setOpen((v) => !v)}
          >
            <Settings2 className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`} />
          </button>
          {/* Menu */}
          {open && (
            <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white/95 dark:bg-black/90 backdrop-blur shadow-md z-[1000]">
              <Link href="/analyze" className="block px-3 py-2 text-sm hover:bg-accent" onClick={() => setOpen(false)}>Analyze</Link>
              <Link href="/reports" className="block px-3 py-2 text-sm hover:bg-accent" onClick={() => setOpen(false)}>Reports</Link>
              <Link href="/profile" className="block px-3 py-2 text-sm hover:bg-accent" onClick={() => setOpen(false)}>Preferences</Link>
            </div>
          )}
        </div>
        {/* Desktop preferences icon */}
        <Link
          href="/profile"
          aria-label="Update Profile"
          className="hidden sm:grid h-9 w-9 place-items-center rounded-md border hover:bg-accent"
          title="Profile"
        >
          <Settings2 className="h-4 w-4" />
        </Link>
        <SignedOut>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm hover:text-primary transition transform duration-200">Sign In</Link>
          </div>
        </SignedOut>
        <SignedIn>
          {role === 'pro' ? (
            <span title="Pro" className="hidden sm:grid h-9 w-9 place-items-center rounded-md">
              <Crown className="h-4 w-4 text-amber-500" />
            </span>
          ) : (
            <Link href="/eatwise-ai-PRO" className="hidden sm:inline-block text-sm rounded-md border px-2.5 py-1.5 hover:bg-accent transition">Upgrade</Link>
          )}
          <UserButton />
        </SignedIn>
      </div>
      </div>
    </header>
  );
}



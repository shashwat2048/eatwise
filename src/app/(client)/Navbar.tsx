"use client";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/ui/theme-toggle-btn";
import { Settings2 } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 overflow-visible backdrop-blur-xl supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-black/30 bg-white/50 dark:bg-black/20 border-b border-white/20">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/EatWise_Logo.png" alt="EatWise" width={28} height={28} className="rounded" />
          <span className="sm:inline ">EatWise</span>
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
          <Link href="/sign-in" className="text-sm hover:text-primary transition transform duration-200">Sign In</Link>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
      </div>
    </header>
  );
}



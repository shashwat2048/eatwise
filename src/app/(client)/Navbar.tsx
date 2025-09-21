"use client";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/ui/theme-toggle-btn";
import { User as UserIcon } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-black/30 bg-white/60 dark:bg-black/30 border-b border-white/20">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/EatWise_Logo.png" alt="EatWise" width={28} height={28} className="rounded" />
          <span className="hidden sm:inline">EatWise</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/analyze" className="hover:underline">Analyze</Link>
          <Link href="/reports" className="hover:underline">Reports</Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <ModeToggle />
        <Link
          href="/profile"
          aria-label="Update Profile"
          className="h-9 w-9 grid place-items-center rounded-md border hover:bg-accent"
          title="Profile"
        >
          <UserIcon className="h-4 w-4" />
        </Link>
        <SignedOut>
          <Link href="/sign-in" className="text-sm underline">Sign In</Link>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
      </div>
    </header>
  );
}



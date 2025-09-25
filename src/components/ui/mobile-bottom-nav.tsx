"use client";

import Link from "next/link";
import { useUserContext } from "@/components/ui/user-context";
import { Home, BarChart2, User, Crown, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { RainbowButton } from "@/components/ui/rainbow-button";

export default function MobileBottomNav() {
  const { role } = useUserContext();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || typeof window === 'undefined') return null;
  const hideOnAuth = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  if (hideOnAuth) return null;

  return createPortal(
    <div
      className="fixed z-[1005] sm:hidden pointer-events-none"
      style={{ left: "50%", transform: "translateX(-50%)", bottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
    >
      <nav className="pointer-events-auto">
        <div className="mx-auto px-3">
          <div className="flex items-center gap-3 rounded-full border bg-white/90 dark:bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-black/50 shadow-lg px-3 py-2">
            <Link href="/" className="flex flex-col items-center gap-1 px-2 text-[11px] text-neutral-700 dark:text-neutral-200">
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link href="/analyze" className="flex flex-col items-center gap-1 px-2 text-[11px] text-neutral-700 dark:text-neutral-200">
              <Search className="h-5 w-5" />
              <span>Analyze</span>
            </Link>
            <Link href="/reports" className="flex flex-col items-center gap-1 px-2 text-[11px] text-neutral-700 dark:text-neutral-200">
              <BarChart2 className="h-5 w-5" />
              <span>Reports</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center gap-1 px-2 text-[11px] text-neutral-700 dark:text-neutral-200">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>,
    document.body
  );
}



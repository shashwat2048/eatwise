import Image from "next/image";
import Link from "next/link";
import { getUserFromCookies } from "@/lib/helper";
import { auth } from "@clerk/nextjs/server";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import AccessGateBanner from "@/components/ui/access-gate-banner";
import HomeHeroActions from "@/components/ui/home-hero-actions";
import HomeCards from "@/components/ui/home-cards";
import { ArrowRightIcon } from "lucide-react";

export default async function Home() {
  const user = await getUserFromCookies();
  const { userId: clerkId } = await auth();

  return (
    <div className="relative">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-200/40 to-transparent dark:from-teal-700/20 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-14 sm:pt-16 sm:pb-20 md:pt-20 md:pb-24">
          <div className="grid gap-10 md:gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <AnimatedShinyText className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] sm:text-xs">Eat smarter with AI</AnimatedShinyText>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">Scan food labels. Get instant, healthy insights.</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-prose">Upload or capture a label photo and EatWise highlights allergens, nutrition, and a simple A–E grade to guide your choices.</p>
              <HomeHeroActions />
              {user && <div className="text-xs text-gray-500">Welcome{user?.name ? `, ${user.name}` : ""}</div>}
              <div className="pt-2">
                <AccessGateBanner />
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -left-10 h-64 w-64 bg-teal-500/20 rounded-full blur-3xl" />
              <Image src="/EatWise_Logo.png" alt="EatWise" width={420} height={420} />
            </div>
          </div>
        </div>
      </section>

      <HomeCards />
      <footer className="mt-6 sm:mt-10 text-center text-xs text-gray-500 mb-4 px-4">
        <p className="hover:text-teal-600">EatWise © {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}

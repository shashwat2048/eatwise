import Image from "next/image";
import Link from "next/link";
import { getUserFromCookies } from "@/lib/helper";
import { auth } from "@clerk/nextjs/server";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import HomeHeroActions from "@/components/ui/home-hero-actions";
import HomeCards from "@/components/ui/home-cards";
import WelcomeName from "@/components/ui/welcome-name";

export default async function Home() {
  const user = await getUserFromCookies();
  const { userId: clerkId } = await auth();

  return (
    <div className="relative">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-200/40 to-transparent dark:from-teal-700/20 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-2 sm:pt-8 sm:pb-2 md:pt-10 md:pb-1">
          <div className="grid gap-10 md:gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <AnimatedShinyText className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] sm:text-xs">Eat smarter with AI</AnimatedShinyText>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">Confused by food labels? We’ve got you.</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-prose">EatWise scans ingredients, detects hidden allergens, and translates complex nutrition into clear insights so you always know what’s good for you.</p>
              <HomeHeroActions />
              {user ? <WelcomeName /> : null}
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -left-10 h-64 w-64 bg-teal-500/20 rounded-full blur-3xl" />
              <Image src="/EatWise_Logo.png" alt="EatWise" width={420} height={420} />
            </div>
          </div>
        </div>
      </section>

      <HomeCards />
      <footer className="mt-1 sm:mt-10 text-center text-xs text-gray-500 mb-4 px-4">
        <p className="hover:text-teal-600">EatWise © {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}

// client component moved to components/ui/client-analyses-info

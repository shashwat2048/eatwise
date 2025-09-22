import Image from "next/image";
import Link from "next/link";
import { getUserFromCookies } from "@/lib/helper";
import { auth } from "@clerk/nextjs/server";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
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
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Link href="/analyze" className="w-full sm:w-auto text-center px-5 py-3 rounded-md bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center gap-2 transition transform duration-300">Start Analyzing</Link>
                <Link href="/reports" className="w-full sm:w-auto text-center px-5 py-3 rounded-md border hover:border-teal-600 transition transform duration-300">View Reports</Link>
              </div>
              {user && <div className="text-xs text-gray-500">Welcome{user?.name ? `, ${user.name}` : ""}</div>}
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -left-10 h-64 w-64 bg-teal-500/20 rounded-full blur-3xl" />
              <Image src="/EatWise_Logo.png" alt="EatWise" width={420} height={420} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/profile" className="group w-full block rounded-xl border p-5 sm:p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition bg-gradient-to-b from-teal-100/40 to-transparent dark:from-teal-700/20">
          <div className="font-medium mb-1">Profile</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Manage allergies & fitness goals</div>
        </Link>
        <Link href="/analyze" className="group w-full block rounded-xl border p-5 sm:p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition bg-gradient-to-b from-teal-100/40 to-transparent dark:from-teal-700/20">
          <div className="font-medium mb-1">Analyze</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Scan or upload a label</div>
        </Link>
        <Link href="/reports" className="group w-full block rounded-xl border p-5 sm:p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition bg-gradient-to-b from-teal-100/40 to-transparent dark:from-teal-700/20">
          <div className="font-medium mb-1">Reports</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Review your past analyses</div>
        </Link>
      </section>
      <footer className="mt-6 sm:mt-10 text-center text-xs text-gray-500 mb-4 px-4">
        <p className="hover:text-teal-600">EatWise © {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}

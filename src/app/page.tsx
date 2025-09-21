import Image from "next/image";
import Link from "next/link";
import { getUserFromCookies } from "@/lib/helper";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await getUserFromCookies();
  const { userId: clerkId } = await auth();

  return (
    <div className="relative">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-200/40 to-transparent dark:from-teal-700/20 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs backdrop-blur bg-white/60 dark:bg-black/30">Eat smarter with AI</div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Scan food labels. Get instant, healthy insights.</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-prose">Upload or capture a label photo and EatWise highlights allergens, nutrition, and a simple A–E grade to guide your choices.</p>
              <div className="flex gap-3">
                <Link href="/analyze" className="px-5 py-3 rounded-md bg-teal-600 text-white hover:bg-teal-700">Start Analyzing</Link>
                <Link href="/reports" className="px-5 py-3 rounded-md border">View Reports</Link>
              </div>
              <div className="text-xs text-gray-500">Welcome{user?.name ? `, ${user.name}` : ""}</div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -left-10 h-64 w-64 bg-teal-500/20 rounded-full blur-3xl" />
              <Image src="/EatWise_Logo.png" alt="EatWise" width={420} height={420} className="" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/profile" className="group block rounded-xl border p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition">
          <div className="font-medium mb-1">Profile</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Manage allergies & fitness goals</div>
        </Link>
        <Link href="/analyze" className="group block rounded-xl border p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition">
          <div className="font-medium mb-1">Analyze</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Scan or upload a label</div>
        </Link>
        <Link href="/reports" className="group block rounded-xl border p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition">
          <div className="font-medium mb-1">Reports</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Review your past analyses</div>
        </Link>
      </section>
    </div>
  );
}

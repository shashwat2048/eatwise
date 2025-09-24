"use client";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function HomeHeroActions() {
  const { isSignedIn } = useAuth();
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
      {isSignedIn ? (
        <>
          <Link href="/analyze" className="group w-full sm:w-auto text-center px-5 py-3 rounded-md bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center gap-2 transition transform duration-300">
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">Get Started</span>
          </Link>
        </>
      ) : (
        <Link href="/sign-in" className="group w-full sm:w-auto text-center px-5 py-3 rounded-md bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center gap-2 transition transform duration-300">
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">Sign Up Now</span>
        </Link>
      )}
    </div>
  );
}



"use client";
import { SignIn, useAuth } from '@clerk/nextjs'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
 
import { useEffect, useState } from 'react'
import { GraphQLClient } from 'graphql-request'

export default function Page() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  
  async function onSignedInMigrate() {
    try {
      router.push('/analyze');
    } catch {
      router.push('/analyze');
    }
  }
  return (
    <div className="relative min-h-[88vh] px-4 py-10 grid place-items-center">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Illustration / brand panel */}
        <div className="hidden md:block">
          <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Image src="/EatWise_Logo.png" alt="EatWise" width={44} height={44} className="rounded" />
              <span className="text-2xl font-semibold">EatWise</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-snug">Your AI-powered health & nutrition assistant</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Scan food labels, get instant insights, and keep your goals on track. Clean, safe, and personalized for you.</p>
              <div className="grid gap-2 text-sm">
                <div>✅ AI-Powered Nutrition Analysis</div>
                <div>✅ Personalized Fitness Tracking</div>
                <div>✅ Allergen Alerts & Safety</div>
                <div>✅ Save & Share Food Reports</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form + value props (mobile) */}
        <div className="mx-auto w-full max-w-md">
          <SignIn appearance={{ elements: { card: 'rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-6 shadow-sm' } }} afterSignInUrl="/profile" signUpFallbackRedirectUrl="/profile" />
          
          <div className="mt-6 grid gap-2 text-xs text-gray-600 dark:text-gray-300 md:hidden">
            <div>✅ AI-Powered Nutrition Analysis</div>
            <div>✅ Personalized Fitness Tracking</div>
            <div>✅ Allergen Alerts & Safety</div>
            <div>✅ Save & Share Food Reports</div>
          </div>
        </div>
      </div>

        <footer className="absolute bottom-4 text-center text-xs text-gray-500">
          <p className="hover:text-teal-600">EatWise © {new Date().getFullYear()} All rights reserved.</p>
        </footer>
    </div>
  )
}
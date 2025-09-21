import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Navbar from "./(client)/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EatWise",
  description: "Food label analyser powered by Gemini",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://eatwise.app"),
  openGraph: {
    title: "EatWise — AI-Powered Food Label Analysis",
    description: "Scan food labels for allergens, nutrition and get a simple A–E Nutri-Score.",
    url: "/",
    siteName: "EatWise",
    images: [
      {
        url: "/EatWise_Logo.png",
        width: 1200,
        height: 630,
        alt: "EatWise",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "EatWise — AI-Powered Food Label Analysis",
    description: "Scan food labels for allergens, nutrition and get a simple A–E Nutri-Score.",
    images: ["/EatWise_Logo.png"],
    site: "@eatwise",
    creator: "@eatwise",
  },
  icons: {
    icon: "/EatWise.ico",
    apple: "/EatWise.ico",
    shortcut: "/EatWise.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
            <main>{children}</main>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

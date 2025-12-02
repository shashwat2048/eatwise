import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const rawBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://eatwise-ai.vercel.app");

  const baseUrl = rawBase.replace(/\/$/, "");
  const now = new Date();

  // Core site routes
  const routes: {
    path: string;
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority?: MetadataRoute.Sitemap[number]["priority"];
  }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/analyze", changeFrequency: "weekly", priority: 0.9 },
    { path: "/eatwise-ai-PRO", changeFrequency: "monthly", priority: 0.7 },
    { path: "/sign-in", changeFrequency: "yearly", priority: 0.3 },
  ];

  // Return formatted sitemap entries
  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency ?? "monthly",
    priority: route.priority ?? 0.5,
  }));
}

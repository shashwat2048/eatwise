"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Report = { id: string; content?: string | null; createdAt: string };

export default function HomeCards() {
  const [recent, setRecent] = useState<Report[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const query = `query{ myReports { id content createdAt } }`;
        const res = await fetch('/api/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query }) });
        const json = await res.json();
        const data: { myReports?: Report[] } = json?.data || {};
        setRecent((data?.myReports || []).slice(0, 3));
      } catch {}
    })();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Link href="/analyze" className="group w-full block rounded-xl border p-5 sm:p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition bg-gradient-to-b from-teal-100/40 to-transparent dark:from-teal-700/20">
        <div className="font-medium mb-1">Analyze</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">Scan or upload a label</div>
      </Link>
      <Link href="/reports" className="group w-full block rounded-xl border p-5 sm:p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition bg-gradient-to-b from-teal-100/40 to-transparent dark:from-teal-700/20">
        <div className="font-medium mb-1">Reports</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">Review your past analyses</div>
      </Link>
      <Link href="/profile" className="group w-full block rounded-xl border p-5 sm:p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition bg-gradient-to-b from-teal-100/40 to-transparent dark:from-teal-700/20">
        <div className="font-medium mb-1">Profile</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">Manage allergies & fitness goals</div>
      </Link>
      {/* Tips card */}
      <div className="group w-full block rounded-xl border p-5 sm:p-6 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition col-span-full lg:col-span-3">
        <div className="font-medium mb-1">Tips</div>
        <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 grid gap-1">
          <li>Snap labels in good light and fill the frame.</li>
          <li>Check allergens list if you’re sensitive (peanuts, gluten, dairy, soy, eggs, shellfish).</li>
          <li>Upgrade to Pro for unlimited analyses.</li>
        </ul>
      </div>
      {/* Recent reports */}
      {recent.length > 0 && (
        <div className="col-span-full">
          <div className="mb-2 font-medium">Recent reports</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map(r => {
              let name = 'Food Label';
              try { name = JSON.parse(r.content||'{}')?.name || 'Food Label'; } catch {}
              return (
                <Link href="/reports" key={r.id} className="rounded-xl border p-4 backdrop-blur bg-white/60 dark:bg-black/30 hover:shadow-md transition">
                  <div className="text-sm font-medium truncate">{name}</div>
                  <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}



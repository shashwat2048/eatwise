"use client";
import { useEffect, useState } from "react";

export default function WelcomeName() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const query = `query{ me { name } }`;
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ query })
        });
        const json = await res.json();
        const n = json?.data?.me?.name || null;
        if (!cancelled) setName(n);
      } catch {
        if (!cancelled) setName(null);
      }
    })();
    return () => { cancelled = true };
  }, []);

  if (!name) return null;
  return (
    <div className="text-xs text-gray-500">Welcome, {name}</div>
  );
}



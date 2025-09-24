"use client";
import { useEffect, useRef, useState } from "react";

export default function ProStatusWatcher() {
  const [enabled, setEnabled] = useState(true);
  const prevRole = useRef<string | null>(null);

  useEffect(() => {
    let timer: any;
    async function tick() {
      try {
        if (!enabled) return;
        const query = `query { myQuota { role unlimited } }`;
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ query })
        });
        const json = await res.json();
        const role: string | undefined = json?.data?.myQuota?.role;
        if (!role) return;
        const was = prevRole.current;
        prevRole.current = role;

        // If role just became pro, refresh once
        if (role === 'pro' && was && was !== 'pro') {
          const key = 'eatwise_pro_refreshed';
          if (sessionStorage.getItem(key) !== '1') {
            sessionStorage.setItem(key, '1');
            // Prefer soft refresh; fallback to hard reload
            try { (window as any).location?.reload(); } catch { window.location.href = window.location.href; }
          }
          setEnabled(false);
        }
      } catch {}
    }

    // Prime initial role
    tick();
    timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [enabled]);

  return null;
}



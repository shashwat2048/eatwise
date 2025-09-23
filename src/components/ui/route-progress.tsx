"use client";
import { useEffect, useState } from "react";

export default function RouteProgress() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let t: any;
    const onHide = () => { setActive(true); clearTimeout(t); t = setTimeout(()=>setActive(false), 700) };
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); clearTimeout(t); };
  }, []);
  return (
    <div className={`fixed top-0 left-0 right-0 h-0.5 z-[1002] transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
      <div className="h-full w-full bg-teal-600 animate-pulse" />
    </div>
  );
}



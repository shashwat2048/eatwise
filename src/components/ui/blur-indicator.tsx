export function BlurIndicator({ score, threshold = 80 }: { score: number | null; threshold?: number }) {
  if (score === null || typeof score !== 'number' || Number.isNaN(score)) {
    return <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">No preview</span>;
  }
  const good = score >= threshold * 1.5;
  const ok = score >= threshold && score < threshold * 1.5;
  const label = good ? 'Sharp' : ok ? 'Okay' : 'Blurry';
  const cls = good
    ? 'bg-green-100 text-green-800 border-green-300'
    : ok
    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : 'bg-red-100 text-red-700 border-red-300';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${cls}`}>
      <span className="font-medium">{label}</span>
      <span className="opacity-70">({Math.round(score)})</span>
    </span>
  );
}



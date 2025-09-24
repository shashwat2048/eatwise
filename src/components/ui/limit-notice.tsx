export default function LimitNotice({ remaining, max }: { remaining: number; max: number }){
  const over = remaining <= 0;
  return (
    <div className={`rounded-xl border p-3 text-xs ${over ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      {over ? 'Free plan limit reached. Upgrade for unlimited.' : `Free: ${remaining} of ${max} analyses left.`}
    </div>
  );
}



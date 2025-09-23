export default function LimitNotice({ plan, remaining, max }: { plan: 'guest'|'free'; remaining: number; max: number }){
  const over = remaining <= 0;
  return (
    <div className={`rounded-xl border p-3 text-xs ${over ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      {plan==='guest' ? (
        over ? 'Guest limit reached (5). Sign in to continue.' : `Guest: ${remaining} of ${max} analyses left.`
      ) : (
        over ? 'Free plan limit reached (10). Upgrade for unlimited.' : `Free: ${remaining} of ${max} analyses left.`
      )}
    </div>
  );
}



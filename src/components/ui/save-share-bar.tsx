export function SaveShareBar({ canSave, onSave, onShare, onUpgrade, plan }: {
  canSave: boolean; onSave: ()=>void; onShare: ()=>void; onUpgrade?: ()=>void; plan: 'guest'|'free'|'pro'
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between rounded-xl border p-3 bg-white/60 dark:bg-black/30">
      <div className="text-xs text-neutral-600 dark:text-neutral-300">
        {plan==='guest' && 'You’re on Guest. Save locally. Sign in to keep reports in your account.'}
        {plan==='free' && 'Free plan. Reports saved to your account.'}
        {plan==='pro' && 'Pro plan. Unlimited analyses.'}
      </div>
      <div className="flex gap-2">
        <button onClick={onShare} className="px-3 py-2 rounded-md border">Share</button>
        {canSave ? (
          <button onClick={onSave} className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700">Save Report</button>
        ) : (
          plan!=='pro' && onUpgrade && (
            <button onClick={onUpgrade} className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700">Upgrade to Pro</button>
          )
        )}
      </div>
    </div>
  );
}



export function StepHeader({ step }: { step: 1|2|3|4 }) {
  const steps = ['Upload/Capture','Analyze','Review','Save/Share'];
  return (
    <ol className="flex items-center gap-3 text-xs sm:text-sm">
      {steps.map((label, i) => {
        const idx = i+1 as 1|2|3|4;
        const active = step >= idx;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={`h-6 w-6 grid place-items-center rounded-full border ${active ? 'bg-teal-600 text-white border-teal-600' : 'bg-white/70 dark:bg-black/30'}`}>
              {idx}
            </span>
            <span className={active ? 'font-medium' : 'text-neutral-500'}>{label}</span>
            {idx<4 && <span className="mx-2 w-6 border-t opacity-50" />}
          </li>
        );
      })}
    </ol>
  );
}



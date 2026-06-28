import { Star } from "lucide-react";

export function StarButton({ prefKey }: { prefKey: string }) {
  return (
    <button
      type="button"
      data-pl-star=""
      data-pref-key={prefKey}
      suppressHydrationWarning
      aria-label={`Star ${prefKey}`}
      aria-pressed="false"
      title="Star"
      className="grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent text-ink-3 transition-colors hover:text-ink sm:h-8 sm:w-8"
    >
      <Star size={18} strokeWidth={1.75} fill="none" />
    </button>
  );
}

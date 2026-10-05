import { Icon } from "./icons";
import { rowIconButtonClass } from "./icon-button";

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
      className={`${rowIconButtonClass} text-ink-3 hover:text-ink`}
    >
      <Icon name="star" size={18} strokeWidth={1.75} />
    </button>
  );
}

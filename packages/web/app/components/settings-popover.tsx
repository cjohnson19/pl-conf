"use client";

import { RotateCcw, Settings } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { usePreferences } from "./preferences-provider";
import clsx from "clsx";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-paper-2"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-[1.45] text-ink-3">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={clsx(
          "mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-pill border transition-colors",
          checked ? "border-ink bg-ink" : "border-rule bg-[color:var(--paper)]"
        )}
      >
        <span
          className={clsx(
            "ml-0.5 inline-block h-4 w-4 rounded-pill transition-transform",
            checked
              ? "translate-x-4 bg-paper"
              : "translate-x-0 bg-[color:var(--ink-3)]"
          )}
        />
      </span>
    </button>
  );
}

export function SettingsPopover() {
  const { prefs, setPrefs, prefsLoaded } = usePreferences();

  const setDeadlineDismissed = (dismissed: boolean) =>
    setPrefs((p) => ({
      ...p,
      display: { ...p.display, deadlineHeroDismissed: dismissed },
    }));

  const clearAllHidden = () =>
    setPrefs((p) => ({
      ...p,
      display: { ...p.display, permanentlyHiddenEventHeroes: [] },
    }));

  const hiddenCount = prefsLoaded
    ? (prefs.display.permanentlyHiddenEventHeroes ?? []).length
    : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Display settings"
          title="Display settings"
          className="grid h-11 w-11 place-items-center rounded-pill text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink data-[state=open]:bg-paper-2 data-[state=open]:text-ink sm:h-[34px] sm:w-[34px]"
        >
          <Settings size={17} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(320px,calc(100vw-2rem))] border-rule p-4 shadow-pop"
        style={{ background: "var(--card)" }}
      >
        <p className="label-cap mb-3">Deadline alerts</p>

        <ToggleRow
          label="Show deadline alerts"
          description="The card above the list highlighting your next starred deadline."
          checked={!prefs.display.deadlineHeroDismissed}
          onChange={(v) => setDeadlineDismissed(!v)}
        />

        <div className="mt-2 flex items-center justify-between gap-3 px-2">
          <p className="text-[11px] leading-[1.45] text-ink-3">
            {hiddenCount > 0
              ? `${hiddenCount} event${hiddenCount === 1 ? "" : "s"} hidden.`
              : "No events hidden."}
          </p>
          <button
            type="button"
            onClick={clearAllHidden}
            disabled={hiddenCount === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-rule bg-transparent px-3 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:border-rule disabled:text-ink-3 disabled:hover:border-rule"
          >
            <RotateCcw size={12} strokeWidth={1.75} />
            Reset hidden
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import dynamic from "next/dynamic";
import { Plus, Settings } from "lucide-react";

const SubmitEventPopover = dynamic(
  () =>
    import("./submit-event-popover").then((m) => ({
      default: m.SubmitEventPopover,
    })),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        aria-label="Submit event"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-ink text-paper sm:h-[34px] sm:w-[34px]"
      >
        <Plus size={15} strokeWidth={1.75} />
      </button>
    ),
  }
);

const SettingsPopover = dynamic(
  () =>
    import("./settings-popover").then((m) => ({ default: m.SettingsPopover })),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        aria-label="Display settings"
        className="grid h-11 w-11 place-items-center rounded-pill text-ink-2 sm:h-[34px] sm:w-[34px]"
      >
        <Settings size={17} strokeWidth={1.75} />
      </button>
    ),
  }
);

export function HeaderActions() {
  return (
    <>
      <SettingsPopover />
      <span
        className="mx-1 hidden h-[18px] w-px bg-rule sm:inline-block"
        aria-hidden
      />
      <SubmitEventPopover />
    </>
  );
}

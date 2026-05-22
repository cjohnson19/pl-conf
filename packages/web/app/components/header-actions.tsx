"use client";

import dynamic from "next/dynamic";
import { HelpCircle, Plus, Settings } from "lucide-react";

const HelpPopover = dynamic(
  () => import("./help-popover").then((m) => ({ default: m.HelpPopover })),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        aria-label="How this site works"
        className="grid h-11 w-11 place-items-center rounded-pill text-ink-2 sm:h-[34px] sm:w-[34px]"
      >
        <HelpCircle size={17} strokeWidth={1.75} />
      </button>
    ),
  }
);

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
        className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-ink text-paper sm:h-[34px] sm:w-[34px]"
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
      <HelpPopover />
      <SettingsPopover />
      <span
        className="mx-1 hidden h-[18px] w-px bg-rule sm:inline-block"
        aria-hidden
      />
      <SubmitEventPopover />
    </>
  );
}

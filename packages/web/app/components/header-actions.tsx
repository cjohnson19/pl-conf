"use client";

import dynamic from "next/dynamic";
import { HelpCircle, Plus, Settings } from "lucide-react";
import {
  headerIconButtonClass,
  headerOutlinedIconButtonClass,
} from "./icon-button";

const HelpPopover = dynamic(
  () => import("./help-popover").then((m) => ({ default: m.HelpPopover })),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        aria-label="How this site works"
        className={headerIconButtonClass}
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
        title="Submit event"
        className={headerOutlinedIconButtonClass}
      >
        <Plus size={16} strokeWidth={1.75} />
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
        className={headerIconButtonClass}
      >
        <Settings size={17} strokeWidth={1.75} />
      </button>
    ),
  }
);

export function HeaderActions({ totalActive }: { totalActive: number }) {
  return (
    <>
      <HelpPopover totalActive={totalActive} />
      <SettingsPopover />
      <span
        className="mx-1 hidden h-[18px] w-px bg-rule sm:inline-block"
        aria-hidden
      />
      <SubmitEventPopover />
    </>
  );
}

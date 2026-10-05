"use client";

import { HelpPopover } from "./help-popover";
import { SettingsPopover } from "./settings-popover";
import { SubmitEventPopover } from "./submit-event-popover";

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

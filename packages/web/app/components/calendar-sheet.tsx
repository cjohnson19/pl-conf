"use client";

import type { ReactElement, ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import clsx from "clsx";
import type { CalendarExport } from "../hooks/use-calendar-export";
import type { DisplayEvent } from "../lib/event-list-view";
import {
  type CopyItemProps,
  type ExportItemProps,
  ExportOptions,
  ExportRowContent,
} from "./export-options";

const itemClass =
  "flex items-center gap-3 rounded-md px-3 py-2.5 no-underline hover:bg-paper-2";

function SheetItem({ href, download, icon, title, sub }: ExportItemProps) {
  return (
    <Dialog.Close asChild>
      <a
        href={href}
        target={download ? undefined : "_blank"}
        download={download}
        className={itemClass}
      >
        <ExportRowContent variant="sheet" icon={icon} title={title} sub={sub} />
      </a>
    </Dialog.Close>
  );
}

function SheetCopyItem({ onSelect, icon, title, sub }: CopyItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx("w-full text-left", itemClass)}
    >
      <ExportRowContent variant="sheet" icon={icon} title={title} sub={sub} />
    </button>
  );
}

function SheetSeparator() {
  return <div className="my-1 h-px bg-rule" />;
}

export function CalendarSheet({
  event,
  data,
  trigger,
  open,
  onOpenChange,
  children,
}: {
  event: DisplayEvent;
  data: CalendarExport;
  trigger: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={clsx(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200"
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={clsx(
            "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-rule bg-card p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-pop supports-[height:100dvh]:max-h-[85dvh]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <Dialog.Title asChild>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="font-ui text-[18px] font-bold leading-none tracking-[-0.015em] text-ink">
                  {event.abbreviation}
                </div>
                <div className="truncate text-[12px] font-normal text-ink-2">
                  {event.name}
                </div>
              </div>
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-paper-2"
            >
              <X size={16} strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          {children}
          <ExportOptions
            variant="sheet"
            data={data}
            slots={{
              Item: SheetItem,
              CopyItem: SheetCopyItem,
              Separator: SheetSeparator,
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

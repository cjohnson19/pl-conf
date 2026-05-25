"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MoreHorizontal, Star, X } from "lucide-react";
import clsx from "clsx";
import type { DisplayEvent } from "../lib/event-list-view";
import { useCalendarExport } from "../lib/use-calendar-export";
import { useFavorite } from "../lib/use-favorite";
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

export function RowActionSheetDialog({
  event,
  prefKey,
}: {
  event: DisplayEvent;
  prefKey: string;
}) {
  // Rendered only when the sheet should be open: start open and seed
  // `hasOpened` so the ICS blob hydrates immediately.
  const [open, setOpen] = useState(true);
  const { on: starred, toggle: toggleStar } = useFavorite(prefKey);
  const data = useCalendarExport(event);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot
  useEffect(() => {
    data.setHasOpened(true);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={`Actions for ${event.abbreviation}`}
        title="Actions"
        className={clsx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-rule bg-transparent text-ink-2 transition-colors",
          "hover:border-ink hover:bg-ink hover:text-paper data-[state=open]:border-ink data-[state=open]:bg-ink data-[state=open]:text-paper"
        )}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </Dialog.Trigger>
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
            "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-rule p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-pop",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
          )}
          style={{ background: "var(--card)" }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <Dialog.Title asChild>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="font-ui text-[18px] font-bold normal-case leading-none tracking-[-0.015em] text-ink">
                  {event.abbreviation}
                </div>
                <div className="truncate text-[12px] font-normal normal-case tracking-normal text-ink-2">
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

          <button
            type="button"
            onClick={toggleStar}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-[14px] hover:bg-paper-2"
          >
            <span
              className={clsx(
                "grid h-9 w-9 place-items-center rounded-sm",
                starred ? "text-[color:var(--accent)]" : "text-ink-3"
              )}
              style={{ background: "var(--paper-2)" }}
            >
              <Star
                size={18}
                strokeWidth={1.75}
                fill={starred ? "currentColor" : "none"}
              />
            </span>
            <span className="flex-1 font-medium text-ink">
              {starred ? "Unstar" : "Star this event"}
            </span>
          </button>

          <div className="my-1 h-px bg-rule" />

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

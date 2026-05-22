"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { cn } from "../lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function SubmitEventPopover() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStatus({ kind: "idle" });
      setUrl("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus({ kind: "submitting" });

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_SUBMISSION_API_URL || "/api/submit";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (response.ok) {
        setStatus({ kind: "success" });
        setUrl("");
        return;
      }

      const error = await response.json().catch(() => ({}));
      const message =
        error?.details?.[0]?.message ||
        error?.message ||
        "Couldn't submit. Try again.";
      setStatus({ kind: "error", message });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Submit event"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-ink text-paper transition-opacity hover:opacity-90 sm:h-[34px] sm:w-[34px]"
        >
          <Plus size={15} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-2rem))] border-rule bg-card p-5 shadow-pop"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <p className="label-cap mb-2">Submit event</p>
        <p className="mb-4 text-[13px] leading-[1.55] text-ink-2">
          Paste a link to the event&apos;s site. I&apos;ll review it and add it
          to the list.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            required
            disabled={status.kind === "submitting"}
            aria-label="Conference URL"
            className="flex h-9 w-full rounded-sm border border-rule bg-paper px-3 text-[13px] text-ink placeholder:text-ink-3 transition-colors focus-visible:border-ink focus-visible:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={status.kind === "submitting" || url.trim().length === 0}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-pill bg-ink px-3 text-[13px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.kind === "submitting" ? "Submitting…" : "Submit"}
          </button>
        </form>

        {status.kind !== "idle" && status.kind !== "submitting" && (
          <p
            role="status"
            className={cn(
              "mt-3 text-[12px] leading-[1.5]",
              status.kind === "success"
                ? "text-ink-2"
                : "text-[color:var(--hot)]"
            )}
          >
            {status.kind === "success"
              ? "Submission received."
              : status.message}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

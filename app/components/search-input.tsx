import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Command } from "lucide-react";
import { Input } from "./ui/input";
import { EventFilter, matchesText } from "@/lib/event-filter";

export function SearchInput({
  value,
  setValue,
}: {
  value: EventFilter;
  setValue: Dispatch<SetStateAction<EventFilter>>;
}) {
  const [debounceValue, setDebounceValue] = React.useState<EventFilter>(
    () => value
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    );
  }, []);

  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setValue(() => debounceValue);
    }, 100);
    return () => clearTimeout(delayInputTimeoutId);
  }, [debounceValue, setValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search"
        className="pr-16"
        onChange={(e) => setDebounceValue(() => matchesText(e.target.value))}
        autoFocus={true}
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
      >
        {isMac ? <Command className="h-3 w-3" /> : <span>Ctrl</span>}
        <span>K</span>
      </kbd>
    </div>
  );
}

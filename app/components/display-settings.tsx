"use client";

import { Dispatch, SetStateAction } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { sorters } from "@/lib/event-sorter";
import { FilterPreferences, PreferenceCollection } from "@/lib/user-prefs";

type Props = {
  prefs: PreferenceCollection;
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
};

const hiddenOptions: {
  value: FilterPreferences["hiddenItemsFilter"];
  label: string;
}[] = [
  { value: "visible", label: "Don't show hidden" },
  { value: "hidden", label: "Show only hidden" },
  { value: "all", label: "Show all" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function SettingsBody({ prefs, setPrefs }: Props) {
  const setSort = (key: string) => {
    if (!key) return;
    setPrefs((prev) => ({ ...prev, sortBy: key }));
  };
  const setHidden = (value: string) => {
    if (!value) return;
    setPrefs((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        hiddenItemsFilter: value as FilterPreferences["hiddenItemsFilter"],
      },
    }));
  };
  const setExact = (value: string) => {
    if (!value) return;
    setPrefs((prev) => ({
      ...prev,
      display: { ...prev.display, exactDeadlineTime: value === "exact" },
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Sort by">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="flex-wrap justify-start"
          value={prefs.sortBy}
          onValueChange={setSort}
        >
          {sorters.map(({ key, label }) => (
            <ToggleGroupItem key={key} value={key}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Section>

      <Section title="Hidden items">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="flex-wrap justify-start"
          value={prefs.filters.hiddenItemsFilter}
          onValueChange={setHidden}
        >
          {hiddenOptions.map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Section>

      <Section title="Deadline display">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="flex-wrap justify-start"
          value={prefs.display.exactDeadlineTime ? "exact" : "date"}
          onValueChange={setExact}
        >
          <ToggleGroupItem value="date">Date only</ToggleGroupItem>
          <ToggleGroupItem value="exact">Exact time</ToggleGroupItem>
        </ToggleGroup>
      </Section>
    </div>
  );
}

const triggerContent = (
  <>
    <SlidersHorizontal />
    <span className="hidden md:inline">Display</span>
  </>
);

export function DisplaySettings({ prefs, setPrefs }: Props) {
  return (
    <>
      <div className="hidden md:inline-flex">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" aria-label="Open display settings">
              {triggerContent}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <SettingsBody prefs={prefs} setPrefs={setPrefs} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" aria-label="Open display settings">
              {triggerContent}
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Display</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SettingsBody prefs={prefs} setPrefs={setPrefs} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

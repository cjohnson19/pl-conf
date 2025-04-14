"use client";
import { EventFilter, isCategory } from "@/lib/event-filter";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Dispatch, SetStateAction, useState } from "react";

export function CategoryFilter({
  setValue,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
}) {
  const [strValue, setStrValue] = useState<string>("");
  return (
    <ToggleGroup
      variant="outline"
      type="single"
      value={strValue}
      onValueChange={(v) => {
        setStrValue(v);
        setValue(() => isCategory(v));
      }}
      asChild
    >
      <ToggleGroupItem value="conference">Conference</ToggleGroupItem>
      <ToggleGroupItem value="workshop">Workshop</ToggleGroupItem>
    </ToggleGroup>
  );
}

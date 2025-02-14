"use client";
import { EventFilter, hasYear } from "@/lib/event-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Dispatch, SetStateAction, useState } from "react";

export function DateFilter({
  setValue,
  years,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
  years: string[];
}) {
  const [strValue, setStrValue] = useState<string>("");
  return years.length <= 1 ? (
    <></>
  ) : (
    <Select
      onValueChange={(v) =>{
        setStrValue(v);
        setValue(() => hasYear(v));
      }}
      value={strValue}
    >
      <SelectTrigger>
        <SelectValue placeholder="Filter by Year" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem value={year} key={year}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

import React, { Dispatch, SetStateAction } from "react";
import { Input } from "./ui/input";
import { EventFilter, hasText } from "@/lib/event-filter";

export function SearchInput({
  value,
  setValue,
}: {
  value: EventFilter;
  setValue: Dispatch<SetStateAction<EventFilter>>;
}) {
  const [debounceValue, setDebounceValue] = React.useState<EventFilter>(
    () => value,
  );

  React.useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setValue(() => debounceValue);
    }, 100);
    return () => clearTimeout(delayInputTimeoutId);
  }, [debounceValue, setValue]);

  return (
    <Input
      type="text"
      placeholder="Search"
      onChange={(e) => setDebounceValue(() => hasText(e.target.value))}
      autoFocus={true}
    />
  );
}

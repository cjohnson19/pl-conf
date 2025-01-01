import React from "react";
import { Input } from "./ui/input";

export function TextFilter({
  value,
  setValue,
}: {
  value: string;
  setValue: (value: string) => void;
}) {
  const [debounceValue, setDebounceValue] = React.useState(value);

  React.useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setValue(debounceValue);
    }, 100);
    return () => clearTimeout(delayInputTimeoutId);
  }, [debounceValue, setValue]);

  return (
    <Input
      type="text"
      placeholder="Search"
      onChange={(e) => setDebounceValue(e.target.value)}
    />
  );
}

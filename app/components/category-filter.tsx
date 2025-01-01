import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export function CategoryFilter({
  value,
  setValue,
}: {
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <ToggleGroup
      variant="outline"
      type="single"
      value={value}
      onValueChange={setValue}
    >
      <ToggleGroupItem value="conference">Conference</ToggleGroupItem>
      <ToggleGroupItem value="workshop">Workshop</ToggleGroupItem>
      <ToggleGroupItem value="journal">Journal</ToggleGroupItem>
    </ToggleGroup>
  );
}

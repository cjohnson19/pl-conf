import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function DateFilter({
  value,
  setValue,
  years,
}: {
  value: string | undefined;
  setValue: (value: string | undefined) => void;
  years: string[];
}) {
  return years.length <= 1 ? (
    <></>
  ) : (
    <Select onValueChange={setValue} value={value}>
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

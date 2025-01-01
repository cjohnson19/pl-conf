import { capitalize } from "../lib/utils";
import { Badge } from "./ui/badge";

export function EventBadges({ tags }: { tags: string[] }) {
  return (
    <div className="flex gap-2">
      {tags.map((tag, i) => (
        <Badge key={i} {...(i !== 0 ? { variant: "secondary" } : {})}>
          {capitalize(tag)}
        </Badge>
      ))}
    </div>
  );
}

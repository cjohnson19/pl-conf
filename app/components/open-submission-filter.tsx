import { EventFilter, openToNewSubmissions } from "@/lib/event-filter";
import { Dispatch, SetStateAction, useState } from "react";
import { Toggle } from "./ui/toggle";

export function OpenSubmissionFilter({
  setValue,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
}) {
  const [enabled, setEnabled] = useState<boolean>(false);
  return (
    <Toggle
      onClick={() => {
        setEnabled((p) => !p);
        setValue(() => openToNewSubmissions(!enabled));
      }}
      variant="outline"
    >
      Open to new submissions
    </Toggle>
  );
}

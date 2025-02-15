import { Dispatch, SetStateAction } from "react";
import { Button } from "./ui/button";
import { StarIcon } from "lucide-react";
import { PreferenceCollection } from "@/lib/event-prefs";

export function FavoriteButton({
  eventName,
  prefs,
  setPrefs,
}: {
  eventName: string;
  prefs: PreferenceCollection;
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
}) {
  return (
    <Button
      variant={"ghost"}
      size={"icon"}
      aria-label={`Toggle favorite status of ${eventName}`}
      onClick={() => {
        setPrefs((prev) => ({
          ...prev,
          [eventName]: {
            ...prev[eventName],
            favorite: !(prev[eventName]?.favorite ?? false),
          },
        }));
      }}
    >
      <StarIcon
        stroke="gold"
        fill="gold"
        fillOpacity={prefs[eventName]?.favorite ? 100 : 0}
      />
    </Button>
  );
}

import { Dispatch, SetStateAction } from "react";
import { Button } from "./ui/button";
import { StarIcon } from "lucide-react";
import { PreferenceCollection } from "@/lib/user-prefs";

export function FavoriteButton({
  prefKey: key,
  prefs,
  setPrefs,
}: {
  prefKey: string;
  prefs: PreferenceCollection;
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
}) {
  return (
    <Button
      variant={"ghost"}
      size={"icon"}
      aria-label={`Toggle favorite status of ${key}`}
      onClick={() => {
        setPrefs((prev) => ({
          ...prev,
          eventPrefs: {
            ...prefs.eventPrefs,
            [key]: {
              ...prefs.eventPrefs.key,
              favorite: !(prev.eventPrefs[key]?.favorite ?? false),
            },
          },
        }));
      }}
    >
      <StarIcon
        stroke="gold"
        fill="gold"
        fillOpacity={prefs.eventPrefs[key]?.favorite ? 100 : 0}
      />
    </Button>
  );
}

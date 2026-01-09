"use client";

import { Button } from "./ui/button";
import { StarIcon } from "lucide-react";
import { usePreferences } from "./preferences-provider";

export function FavoriteButton({ prefKey: key }: { prefKey: string }) {
  const { prefs, setPrefs } = usePreferences();

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
              ...prefs.eventPrefs[key],
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

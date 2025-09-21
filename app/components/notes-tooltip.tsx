"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Info } from "lucide-react";

interface NotesTooltipProps {
  notes: string[];
}

export function NotesTooltip({ notes }: NotesTooltipProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip
        delayDuration={100}
        open={isTooltipOpen}
        onOpenChange={setIsTooltipOpen}
      >
        <TooltipTrigger asChild>
          <Info
            className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help"
            onClick={() => setIsTooltipOpen(!isTooltipOpen)}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            {notes.map((note, i) => (
              <p key={i} className="text-sm">
                {note}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

"use client";

import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function EventTitleTooltip({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

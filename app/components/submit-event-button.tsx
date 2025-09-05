import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function SubmitEventButton() {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button variant={"outline"} size={"icon"} asChild>
            <Link href="/submit">
              <Plus />
              <span className="sr-only">Submit Event</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">Submit a new event</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

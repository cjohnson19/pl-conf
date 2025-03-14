import { Dispatch, SetStateAction } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Toggle } from "./ui/toggle";

export function HiddenFilter({
  value,
  setValue,
}: {
  value: boolean;
  setValue: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Toggle
            variant={"outline"}
            onClick={() => setValue((v: boolean) => !v)}
          >
            {value ? <EyeIcon /> : <EyeOffIcon />}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          {value ? "Hide hidden items" : "Show hidden items"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

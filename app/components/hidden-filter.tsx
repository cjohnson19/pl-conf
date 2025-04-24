import { Dispatch, SetStateAction } from "react";
import { EyeIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

export function HiddenFilter({
  value,
  setValue,
}: {
  value: boolean;
  setValue: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <EyeIcon /> <span className="hidden md:inline">Hidden Items</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value ? "Show" : "Hide"}>
          <DropdownMenuRadioItem
            value={"Hide"}
            onClick={() => {
              setValue(() => false);
            }}
          >
            Do not show hidden items
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"Show"}
            onClick={() => {
              setValue(() => true);
            }}
          >
            Show hidden items
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

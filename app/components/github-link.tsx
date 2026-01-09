"use client";

import { Github } from "lucide-react";
import { Button } from "./ui/button";
import { redirect, RedirectType } from "next/navigation";

export function GithubLink() {
  return (
    <Button
      variant={"outline"}
      size={"icon"}
      onClick={() =>
        redirect("https://github.com/cjohnson19/pl-conf", RedirectType.push)
      }
      aria-label="Visit website's GitHub page"
    >
      <Github />
      <span className="sr-only">GitHub</span>
    </Button>
  );
}

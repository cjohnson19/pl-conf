import { Github } from "lucide-react";
import { Button } from "./ui/button";

export function GithubLink() {
  return (
    <Button
      variant="outline"
      size="icon"
      asChild
      aria-label="Visit website's GitHub page"
    >
      <a
        href="https://github.com/cjohnson19/pl-conf"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Github />
        <span className="sr-only">GitHub</span>
      </a>
    </Button>
  );
}

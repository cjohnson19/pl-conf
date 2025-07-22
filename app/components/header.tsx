import Link from "next/link";
import { ModeToggle } from "./theme-toggle";
import { GithubLink } from "./github-link";

export function Header() {
  return (
    <header className="fixed z-10 gap-5 flex items-center justify-between w-full border-b-2 bg-background/85 backdrop-blur-sm px-2 sm:px-7 py-4 md:px-11">
      <h4 className="text-clip text-nowrap shrink min-w-0">
        <Link href="/">PL Conferences</Link>
      </h4>
      <div className="flex items-center gap-4">
        <Link href="/about">About</Link>
        <GithubLink />
        <ModeToggle />
      </div>
    </header>
  );
}

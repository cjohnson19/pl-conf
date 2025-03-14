import Link from "next/link";
import { ModeToggle } from "./theme-toggle";
import { GithubLink } from "./github-link";

export function Header() {
  return (
    <header className="fixed z-10 flex items-center justify-between w-full border-b-2 bg-background/85 backdrop-blur-sm px-11 py-4">
      <h1 className="text-lg font-bold md:text-2xl">
        <Link href="/">PL Conferences</Link>
      </h1>
      <div className="flex items-center gap-4">
        <Link href="/about">About</Link>
        <GithubLink />
        <ModeToggle />
      </div>
    </header>
  );
}

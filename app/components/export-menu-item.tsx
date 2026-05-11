"use client";

import { DropdownMenuItem } from "./ui/dropdown-menu";

export const menuItemClass =
  "cursor-pointer rounded-md px-3 py-2.5 text-[13px] text-ink focus:bg-paper-2 focus:text-ink";

export function MenuRowContent({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <>
      <span
        className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-sm"
        style={{ background: "var(--paper-2)" }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="font-medium">{title}</span>
        <span className="font-mono text-[11px] tracking-[0.02em] text-ink-3">
          {sub}
        </span>
      </span>
    </>
  );
}

export function ExportMenuItem({
  href,
  title,
  sub,
  icon,
  download,
}: {
  href: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  download?: boolean | string;
}) {
  return (
    <DropdownMenuItem asChild className={menuItemClass}>
      <a
        href={href}
        target={download ? undefined : "_blank"}
        rel={download ? undefined : "noopener noreferrer"}
        download={download}
        className="flex items-center gap-2.5 no-underline"
      >
        <MenuRowContent icon={icon} title={title} sub={sub} />
      </a>
    </DropdownMenuItem>
  );
}

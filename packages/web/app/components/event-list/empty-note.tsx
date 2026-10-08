import type { ReactNode } from "react";

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-8 text-[13px] text-fg-3 md:px-8">{children}</div>
  );
}

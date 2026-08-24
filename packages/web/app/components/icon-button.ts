// Shared icon-button chrome: 44px touch targets that shrink on sm+ screens.
// Compose per-site color state on top of `rowIconButtonClass`.

export const headerIconButtonClass =
  "grid h-11 w-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink data-[state=open]:bg-paper-2 data-[state=open]:text-ink sm:h-[34px] sm:w-[34px]";

export const headerOutlinedIconButtonClass =
  "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rule text-ink-2 transition-colors hover:border-ink hover:text-ink data-[state=open]:border-ink data-[state=open]:text-ink sm:h-[34px] sm:w-[34px]";

export const rowIconButtonClass =
  "grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent transition-colors sm:h-8 sm:w-8";

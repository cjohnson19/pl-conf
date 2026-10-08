// Shared icon-button chrome: 44px touch targets that shrink on sm+ screens.
// Compose per-site color state on top of `rowIconButtonClass`.

export const headerIconButtonClass =
  "grid h-11 w-11 place-items-center rounded-full text-fg-2 transition-colors hover:bg-bg-2 hover:text-fg data-[state=open]:bg-bg-2 data-[state=open]:text-fg sm:h-[34px] sm:w-[34px]";

export const headerOutlinedIconButtonClass =
  "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-fg-2 transition-colors hover:border-fg hover:text-fg data-[state=open]:border-fg data-[state=open]:text-fg sm:h-[34px] sm:w-[34px]";

export const rowIconButtonClass =
  "grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent transition-colors sm:h-8 sm:w-8";

// "All events" on an event page pops back to the list entry rather than
// pushing a fresh `/`, so the browser restores scroll and the filter query
// string on its own. That needs to know how many entries back the list is,
// since events link to each other and the chain can run several deep.
//
// Depth lives in two places, each for a different reason:
//
//   - `history.state` is the durable per-entry record. It survives a reload
//     of that entry and comes back when the user traverses to it, which is
//     what keeps the count right after a back-then-sideways navigation.
//   - `lastDepth` relays the count to the next entry, since the History API
//     only ever exposes the current entry's state. Module scope is document
//     scope: it resets on a hard load, exactly when a leftover count would
//     be a lie. `undefined` therefore means "no list behind us" — deep link,
//     new tab, pasted URL — and callers fall back to a plain push.
//
// This assumes nothing pushes a history entry between the list and an event.
// Filter changes hold to that today by using `replace`/`replaceState`; a
// `router.push` added between them would silently skew the count.

const LIST_DEPTH = 0;

let lastDepth: number | undefined;

function storedDepth(): number | undefined {
  return window.history.state?.plConfDepth;
}

function stamp(depth: number): void {
  window.history.replaceState(
    { ...window.history.state, plConfDepth: depth },
    ""
  );
}

export function anchorListDepth(): void {
  if (storedDepth() !== LIST_DEPTH) stamp(LIST_DEPTH);
  lastDepth = LIST_DEPTH;
}

export function resolveEventDepth(): number | undefined {
  const stored = storedDepth();
  const depth =
    stored !== undefined
      ? stored
      : lastDepth !== undefined
        ? lastDepth + 1
        : undefined;

  if (depth !== stored && depth !== undefined) stamp(depth);
  lastDepth = depth;
  return depth;
}

import { permanentRedirect } from "next/navigation";
import { ListPage } from "./components/event-list/list-page";
import type { RawSearchParams } from "./lib/filter-params";

// The archive used to be `/?view=archive`; send old links to its own route,
// keeping the chips and tags they carried.
function archiveRedirect(sp: RawSearchParams): string | undefined {
  const { view, ...rest } = sp;
  if (view !== "archive") return undefined;
  const qs = new URLSearchParams(
    Object.entries(rest).flatMap(([k, v]) =>
      v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v]]
    )
  ).toString();
  return `/archive/${qs ? `?${qs}` : ""}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const target = archiveRedirect(await searchParams);
  if (target) permanentRedirect(target);
  return <ListPage searchParams={searchParams} archive={false} />;
}

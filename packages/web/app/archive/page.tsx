import type { Metadata } from "next";
import { ListPage } from "../components/event-list/list-page";
import type { RawSearchParams } from "../lib/filter-params";

export const metadata: Metadata = {
  title: "Past events · PL Conferences",
};

export default function Archive({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <ListPage searchParams={searchParams} archive />;
}

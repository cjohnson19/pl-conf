"use client";

import dynamic from "next/dynamic";
import { ScheduledEvent } from "@/lib/event";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";

const EventOptions = dynamic(
  () => import("./event-options/event-options").then((mod) => mod.EventOptions),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" size="icon" disabled>
        <Menu />
      </Button>
    ),
  }
);

export function EventOptionsWrapper({ e }: { e: ScheduledEvent }) {
  return <EventOptions e={e} />;
}

import { EventType, MaybeDate, ScheduledEvent } from "./event.js";
export type EventFilter = (event: ScheduledEvent) => boolean;
export declare function hasDate(s: MaybeDate): s is string;
export declare const isActive: EventFilter;
export declare const isType: (t: EventType) => EventFilter;
export declare const hasTag: (tag: string) => EventFilter;
export declare const startsAfter: (date: Date) => EventFilter;
export declare const startsBefore: (date: Date) => EventFilter;
export declare const hasYear: (year: number) => EventFilter;
export declare const hasFutureDeadline: EventFilter;
export declare const hasOpenSubmission: EventFilter;
export declare const startsBetween: (range: {
    from?: Date;
    to?: Date;
}) => EventFilter;
export declare const matchesText: (text: string) => EventFilter;
export declare function applyFilters(events: ScheduledEvent[], filters: EventFilter[]): ScheduledEvent[];
//# sourceMappingURL=event-filters.d.ts.map
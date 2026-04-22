import { ScheduledEvent } from "./event.js";
export type EventSorter = (a: ScheduledEvent, b: ScheduledEvent) => number;
export declare function sortWith<T>(l: T[], fns: ((a: T, b: T) => number)[]): T[];
export declare function sortByFirstDeadline(a: ScheduledEvent, b: ScheduledEvent): number;
export declare function sortByEventDate(a: ScheduledEvent, b: ScheduledEvent): number;
export declare function sortByLastUpdated(a: ScheduledEvent, b: ScheduledEvent): number;
export declare function compose(s1: EventSorter, s2: EventSorter): EventSorter;
//# sourceMappingURL=event-sorters.d.ts.map
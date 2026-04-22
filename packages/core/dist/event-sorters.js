import { compareAsc, compareDesc } from "date-fns";
import { firstDeadline } from "./event.js";
export function sortWith(l, fns) {
    return l.toSorted((a, b) => fns.reduce((p, f) => (p === 0 ? f(a, b) : p), 0));
}
export function sortByFirstDeadline(a, b) {
    const aDate = firstDeadline(a);
    const bDate = firstDeadline(b);
    if (aDate === undefined && bDate === undefined)
        return 0;
    if (aDate === undefined)
        return 1;
    if (bDate === undefined)
        return -1;
    return compareAsc(aDate, bDate);
}
export function sortByEventDate(a, b) {
    return compareAsc(a.date.start, b.date.start);
}
export function sortByLastUpdated(a, b) {
    return compareDesc(a.lastUpdated, b.lastUpdated);
}
export function compose(s1, s2) {
    return (a, b) => {
        const r1 = s1(a, b);
        return r1 === 0 ? s2(a, b) : r1;
    };
}
//# sourceMappingURL=event-sorters.js.map
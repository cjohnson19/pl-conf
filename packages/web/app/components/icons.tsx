import { createElement, type SVGProps } from "react";
import { ArrowUpRight, Calendar, ChevronDown, Ellipsis, Star } from "lucide";

// The list repeats a handful of icons hundreds of times, so each one is
// defined once as a <symbol> and every instance is a two-element <use>.
// Symbols carry only geometry: fill and stroke inherit from the outer <svg>,
// which keeps the starred-state `svg{fill:currentColor}` rules working.
const icons = {
  star: Star,
  calendar: Calendar,
  ellipsis: Ellipsis,
  "arrow-up-right": ArrowUpRight,
  "chevron-down": ChevronDown,
} as const;

export type IconName = keyof typeof icons;

export function IconSprite() {
  return (
    <svg aria-hidden="true" style={{ display: "none" }}>
      {Object.entries(icons).map(([name, [, , children = []]]) => (
        <symbol id={`i-${name}`} key={name} viewBox="0 0 24 24">
          {children.map(([tag, attrs]) =>
            createElement(tag, { ...attrs, key: Object.values(attrs).join() })
          )}
        </symbol>
      ))}
    </svg>
  );
}

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

// Mirrors lucide-react's root <svg> attributes so a swapped icon renders
// pixel-identical, including stroke scaling with `size`.
export function Icon({ name, size = 24, strokeWidth = 2, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}

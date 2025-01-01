import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(s: string) {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

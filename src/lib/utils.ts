import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'b';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'm';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'k';
  }
  return num.toFixed(2);
}

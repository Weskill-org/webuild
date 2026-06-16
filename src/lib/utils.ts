import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const cleanStr = url.replace(/[\x00-\x1F\x7F]/g, "");
    const parsed = new URL(cleanStr, "https://fallback.com");
    const protocol = parsed.protocol.toLowerCase();
    if (["http:", "https:", "mailto:"].includes(protocol)) {
      return cleanStr;
    }
  } catch (e) {
    // Ignore error
  }
  return "#";
}

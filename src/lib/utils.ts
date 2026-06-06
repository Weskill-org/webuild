import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const cleanUrl = url.replace(/[\x00-\x1F\x7F]/g, "");
    const parsed = new URL(cleanUrl, window.location.origin);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return parsed.href;
    }
    return "";
  } catch (e) {
    return "";
  }
}

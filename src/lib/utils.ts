import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const cleanUrl = url.replace(/[\x00-\x1F\x7F]/g, "").trim();
  try {
    const parsed = new URL(cleanUrl);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return parsed.toString();
    }
    return "#";
  } catch (e) {
    if (cleanUrl.startsWith("/") || cleanUrl.startsWith("#") || cleanUrl.startsWith("?")) {
      return cleanUrl;
    }
    if (!cleanUrl.includes(":")) {
      return `https://${cleanUrl}`;
    }
    return "#";
  }
}

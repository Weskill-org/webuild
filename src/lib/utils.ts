import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url: string | null | undefined, fallback = '#'): string {
  if (!url) return fallback;

  // SECURITY: Strip control characters to prevent URL parsing bypasses
  const cleanStr = url.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!cleanStr) return fallback;

  try {
    const parsedUrl = new URL(cleanStr);
    if (['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)) {
      return parsedUrl.href;
    }
    return fallback;
  } catch (e) {
    // If it doesn't parse with new URL() directly, it might be missing a protocol.
    // Try prepending https://
    try {
      const parsedWithProtocol = new URL(`https://${cleanStr}`);
      return parsedWithProtocol.href;
    } catch (e2) {
      return fallback;
    }
  }
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;

  // Strip control characters to prevent XSS bypasses
  const cleanUrl = url.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!cleanUrl) return undefined;

  try {
    const parsed = new URL(cleanUrl);
    // Only allow safe protocols
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.toString();
    }
    return undefined;
  } catch (e) {
    // If URL parsing fails, check if it's a relative path
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('#') || cleanUrl.startsWith('?')) {
      return cleanUrl;
    }

    // Fallback: if it doesn't have a protocol and doesn't look like a malicious scheme, assume https
    if (!/^[a-zA-Z]+:/.test(cleanUrl)) {
      try {
        const fallback = new URL(`https://${cleanUrl}`);
        return fallback.toString();
      } catch (e2) {
        return undefined;
      }
    }

    return undefined;
  }
}

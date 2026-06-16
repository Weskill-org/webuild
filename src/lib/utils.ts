import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a URL string to prevent XSS attacks via javascript: or data: URIs.
 * Only allows http:, https:, and mailto: protocols.
 * Prepend https:// if no protocol is given.
 */
export function sanitizeUrl(url: string | null | undefined, fallback = '#'): string {
  if (!url) return fallback;
  try {
    const urlString = String(url).trim();
    const hasProtocol = /^[a-zA-Z]+:/.test(urlString);
    const urlWithProtocol = hasProtocol ? urlString : `https://${urlString}`;
    const parsed = new URL(urlWithProtocol);

    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.toString();
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

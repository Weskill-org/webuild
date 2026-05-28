import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a URL to prevent XSS via javascript: or data: URIs.
 * If the URL doesn't have a protocol, it prepends https://.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";

  // Allow mailto: links
  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return trimmed;
  }

  try {
    // If it doesn't have a protocol, assume https
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);

    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "#";
    }

    return parsed.toString();
  } catch (e) {
    // Invalid URL fallback
    return "#";
  }
}

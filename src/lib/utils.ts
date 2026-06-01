import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a URL string by ensuring it has a safe protocol.
 * Helps prevent XSS vulnerabilities from javascript: or data: URIs.
 */
export function sanitizeUrl(url?: string | null): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url.trim());
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch (error) {
    // If it doesn't parse as a full URL, we can attempt to check if it's a relative path,
    // but for user-provided external links like websites/linkedin, we should be strict.
    // Allow relative paths that start with a single slash (but not double slash `//` which can be protocol-relative)
    if (url.trim().startsWith("/") && !url.trim().startsWith("//")) {
      return url.trim();
    }
  }
  return "#";
}

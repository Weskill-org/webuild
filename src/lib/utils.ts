import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a user-provided URL to prevent XSS attacks (e.g. via javascript: URIs).
 * Ensures the URL uses a safe protocol (http, https, or mailto).
 * If the URL is missing a protocol but seems like a valid domain, it prepends https://.
 */
export function sanitizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  const trimmedUrl = url.trim();

  try {
    const parsed = new URL(trimmedUrl);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.href;
    }
    return '#';
  } catch (e) {
    const lowerUrl = trimmedUrl.toLowerCase();
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) {
      return '#';
    }

    // If it's a domain without a protocol, assume https
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://') && !lowerUrl.startsWith('mailto:')) {
      return `https://${trimmedUrl}`;
    }

    return '#';
  }
}

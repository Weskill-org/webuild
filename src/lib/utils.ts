import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a URL to ensure it has a safe protocol and prevents XSS.
 * If the URL starts with javascript:, data:, or vbscript:, it returns '#'.
 */
export function sanitizeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Strip control characters to prevent URL parsing bypasses
  const cleanUrl = url.replace(/[\x00-\x1F\x7F]/g, '').trim();

  try {
    const parsed = new URL(cleanUrl);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return parsed.href;
    }
    // If it's a valid URL but not a safe protocol, fall back to #
    return '#';
  } catch (error) {
    // If URL parsing fails, it might be a relative URL or something without a protocol
    const lowerUrl = cleanUrl.toLowerCase();

    // Explicitly block known dangerous protocols
    if (
      lowerUrl.startsWith('javascript:') ||
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:')
    ) {
      return '#';
    }

    // For things like "example.com", assume it's meant to be an absolute URL
    // We could prefix with https://, but returning as-is (if safe) allows relative paths too.
    return cleanUrl;
  }
}

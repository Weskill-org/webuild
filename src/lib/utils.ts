import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url?: string | null): string {
  if (!url) return '#';

  // Strip control characters
  const cleanUrl = url.replace(/[\x00-\x1F\x7F]/g, '');

  try {
    const parsed = new URL(cleanUrl, 'http://localhost');
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return cleanUrl;
    }
    return '#';
  } catch (e) {
    return '#';
  }
}

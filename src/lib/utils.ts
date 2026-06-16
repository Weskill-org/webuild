import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;

  const trimmedUrl = url.trim();
  let urlToParse = trimmedUrl;

  // If the URL doesn't have a protocol, assume https
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(urlToParse)) {
    urlToParse = 'https://' + urlToParse;
  }

  try {
    const parsed = new URL(urlToParse);
    // Only allow specific safe protocols
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.href;
    }
    return undefined;
  } catch (e) {
    // If it can't be parsed as a URL, reject it
    return undefined;
  }
}

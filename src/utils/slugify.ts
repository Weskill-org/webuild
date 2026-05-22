/**
 * Converts a string into a URL-friendly slug.
 * E.g., "Hello World! - Part 1" -> "hello-world-part-1"
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

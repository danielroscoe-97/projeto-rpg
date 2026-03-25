/**
 * Server-side input sanitization (NFR16).
 * Strips HTML tags and trims whitespace from user-generated text.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/&[^;]+;/g, "") // strip HTML entities
    .trim();
}

/**
 * Sanitize an object's string values recursively.
 * Non-string values are passed through unchanged.
 */
export function sanitizeRecord<T extends Record<string, unknown>>(
  record: T
): T {
  const result = { ...record };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    }
  }
  return result;
}

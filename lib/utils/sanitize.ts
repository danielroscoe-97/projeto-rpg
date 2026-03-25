/**
 * Server-side input sanitization (NFR16).
 * Strips HTML tags and encodes dangerous characters to prevent XSS injection.
 * Preserves legitimate text containing '&', '<', and '>' as plain text.
 */
export function sanitizeText(input: string): string {
  return input
    // Strip complete HTML/script tags (angle bracket pairs with content)
    .replace(/<\s*\/?\s*[a-zA-Z][^>]*>/g, "")
    // Encode any remaining '<' and '>' that could form partial tags
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

/**
 * Sanitize an object's string values recursively.
 * Non-string values are passed through unchanged.
 * Nested objects and arrays are also traversed.
 */
export function sanitizeRecord<T extends Record<string, unknown>>(
  record: T
): T {
  const result = { ...record };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeRecord(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeText(item)
          : item !== null && typeof item === "object"
          ? sanitizeRecord(item as Record<string, unknown>)
          : item
      );
    }
  }
  return result;
}

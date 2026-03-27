/**
 * BMAD Orchestrator — Input Validation
 *
 * Validates and sanitizes user-controlled strings before use in
 * git commands, file paths, and CLI arguments.
 *
 * SECURITY: Prevents command injection by rejecting invalid inputs
 * at the boundary, rather than trying to escape them.
 */

/** Valid branch name characters: alphanumeric, slashes, dots, hyphens, underscores */
const BRANCH_NAME_RE = /^[a-zA-Z0-9/_.-]+$/;

/** Valid story ID: stream-number or v2-X-Y pattern */
const STORY_ID_RE = /^[a-zA-Z0-9][-a-zA-Z0-9_.]*$/;

/** Max length for branch names (git limit is ~255, we use 100 for sanity) */
const MAX_BRANCH_LENGTH = 100;

/** Max length for story IDs */
const MAX_STORY_ID_LENGTH = 60;

/**
 * Validate a branch name against safe patterns.
 * Throws if invalid.
 */
export function validateBranchName(name: string): string {
  if (!name || name.length > MAX_BRANCH_LENGTH) {
    throw new Error(`Invalid branch name: empty or too long (max ${MAX_BRANCH_LENGTH} chars)`);
  }
  if (!BRANCH_NAME_RE.test(name)) {
    throw new Error(`Invalid branch name: "${name}" contains unsafe characters. Allowed: [a-zA-Z0-9/_.-]`);
  }
  // Reject git-special patterns
  if (name.includes("..") || name.startsWith("-") || name.endsWith(".lock")) {
    throw new Error(`Invalid branch name: "${name}" uses reserved git pattern`);
  }
  return name;
}

/**
 * Validate a story ID.
 * Throws if invalid.
 */
export function validateStoryId(id: string): string {
  if (!id || id.length > MAX_STORY_ID_LENGTH) {
    throw new Error(`Invalid story ID: empty or too long (max ${MAX_STORY_ID_LENGTH} chars)`);
  }
  if (!STORY_ID_RE.test(id)) {
    throw new Error(`Invalid story ID: "${id}" contains unsafe characters`);
  }
  return id;
}

/**
 * Sanitize a string for use as part of a branch slug.
 * Returns only safe characters.
 */
export function toBranchSafeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

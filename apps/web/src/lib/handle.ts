// Mirrors IdentityRegistry.isValidHandle: 3–20 characters of a-z, 0-9 and
// underscore, starting with a letter.
const HANDLE = /^[a-z][a-z0-9_]{2,19}$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE.test(handle);
}

/** What a user typed ("@Sam_01 ") → the canonical form ("sam_01"). Not validated. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}

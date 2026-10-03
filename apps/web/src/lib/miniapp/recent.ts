// Which Mini Apps this person opened last, so the Apps screen can put them
// first. Per browser, never leaves the device, and only ever holds app ids that
// the registry has to confirm before anything is shown.

const KEY = "crackpay.apps.recent";

/** How many apps to remember. One short row, not a history. */
export const RECENT_APP_LIMIT = 4;

const listeners = new Set<() => void>();

/**
 * The stored value verbatim. A string, not a parsed list, because
 * useSyncExternalStore compares snapshots by identity and a fresh array every
 * read would never settle.
 */
export function recentAppsSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** Nothing is stored on the server, so the first paint shows no recent apps. */
export const serverRecentAppsSnapshot = () => "";

export function subscribeRecentApps(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function parseRecentApps(stored: string): string[] {
  if (!stored) return [];
  try {
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === "string").slice(0, RECENT_APP_LIMIT);
  } catch {
    return [];
  }
}

export const recentAppIds = () => parseRecentApps(recentAppsSnapshot());

/** Puts `id` first, without duplicates, keeping at most RECENT_APP_LIMIT. */
export function withRecentApp(list: readonly string[], id: string): string[] {
  return [id, ...list.filter((entry) => entry !== id)].slice(0, RECENT_APP_LIMIT);
}

export function rememberApp(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(withRecentApp(recentAppIds(), id)));
  } catch (error) {
    console.error("Could not remember the app that was opened", error);
  }
  for (const listener of listeners) listener();
}

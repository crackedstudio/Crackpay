// Developer settings, modelled on MiniPay's: hidden until the version number in
// Settings is tapped several times. They let a developer load their own URL as
// a Mini App before it is reviewed and listed, and turn on debugging aids.
// Everything here is per browser and never leaves the device.

const UNLOCKED = "crackpay.dev.unlocked";
const ENABLED = "crackpay.dev.enabled";
const RECENT = "crackpay.dev.recentUrls";
const LOG_MESSAGES = "crackpay.dev.logMessages";
// Written by earlier versions, which remembered a single URL.
const LEGACY_LAST_URL = "crackpay.dev.lastUrl";

/** Taps on the version number needed to reveal Developer settings. */
export const UNLOCK_TAPS = 7;

/** How many test URLs to remember. */
export const RECENT_LIMIT = 5;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (error) {
    console.error("Could not save developer setting", error);
  }
}

function recentUrls(): string[] {
  try {
    const stored: unknown = JSON.parse(read(RECENT) ?? "[]");
    if (Array.isArray(stored)) return stored.filter((url): url is string => typeof url === "string").slice(0, RECENT_LIMIT);
  } catch {
    // Fall through to the legacy single value.
  }
  const legacy = read(LEGACY_LAST_URL);
  return legacy ? [legacy] : [];
}

/** Puts `url` first, without duplicates, keeping at most RECENT_LIMIT. */
export function withRecent(list: readonly string[], url: string): string[] {
  return [url, ...list.filter((entry) => entry !== url)].slice(0, RECENT_LIMIT);
}

export const developer = {
  isUnlocked: () => read(UNLOCKED) === "1",
  unlock: () => write(UNLOCKED, "1"),

  isEnabled: () => read(ENABLED) === "1",
  setEnabled: (enabled: boolean) => write(ENABLED, enabled ? "1" : null),

  recentUrls,
  rememberUrl: (url: string) => write(RECENT, JSON.stringify(withRecent(recentUrls(), url))),
  clearRecentUrls: () => {
    write(RECENT, null);
    write(LEGACY_LAST_URL, null);
  },

  /** When on, the Mini App host logs every message to the browser console. */
  isLoggingMessages: () => read(LOG_MESSAGES) === "1",
  setLoggingMessages: (enabled: boolean) => write(LOG_MESSAGES, enabled ? "1" : null),
};

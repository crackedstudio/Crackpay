// Developer mode, modelled on MiniPay's: hidden until the version number in
// Settings is tapped several times, then switched on explicitly. It lets a
// developer load their own URL as a Mini App before it is reviewed and listed.

const UNLOCKED = "crackpay.dev.unlocked";
const ENABLED = "crackpay.dev.enabled";
const LAST_URL = "crackpay.dev.lastUrl";

/** Taps on the version number needed to reveal Developer settings. */
export const UNLOCK_TAPS = 7;

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

export const developer = {
  isUnlocked: () => read(UNLOCKED) === "1",
  unlock: () => write(UNLOCKED, "1"),
  isEnabled: () => read(ENABLED) === "1",
  setEnabled: (enabled: boolean) => write(ENABLED, enabled ? "1" : null),
  lastUrl: () => read(LAST_URL) ?? "",
  setLastUrl: (url: string) => write(LAST_URL, url),
};

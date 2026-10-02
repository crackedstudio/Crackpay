import { USDC_DECIMALS } from "./money";

/**
 * Editing the amount a keypad is typing. Kept apart from the keypad itself so
 * the rules are testable: what cannot be a spendable amount should never become
 * one on screen, rather than being rejected later with an error.
 */
export const AMOUNT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

export type AmountKey = (typeof AMOUNT_KEYS)[number];

export function isAmountKey(key: string): key is AmountKey {
  return (AMOUNT_KEYS as readonly string[]).includes(key);
}

/** The most dollars anyone can type, so the figure cannot outgrow the screen. */
const MAX_WHOLE_DIGITS = 9;

/** Applies one keypress to the typed amount. */
export function pressAmountKey(current: string, key: string): string {
  if (key === "del") return current.slice(0, -1);
  if (key === ".") return current.includes(".") ? current : `${current || "0"}.`;
  if (!/^\d$/.test(key)) return current;

  const [whole = "", fraction = ""] = current.split(".");
  // More decimals than USDC has would be rejected by parseAmount; refuse the keystroke instead.
  if (current.includes(".")) {
    return fraction.length >= USDC_DECIMALS ? current : current + key;
  }
  // A leading zero is a placeholder, not a digit.
  if (current === "0") return key;
  if (whole.length >= MAX_WHOLE_DIGITS) return current;
  return current + key;
}

import type { Address } from "viem";
import { formatAmount } from "./money";

export const shortAddress = (address: Address) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** A dollar figure for display: "$1,234.56". */
export const dollars = (base: bigint) => `$${formatAmount(base)}`;

/** Turns anything thrown into one line a person can read, and logs the original. */
export function errorText(error: unknown): string {
  console.error(error);
  if (error instanceof Error) {
    // A dismissed or timed-out passkey prompt.
    if (error.name === "NotAllowedError") return "The passkey request was cancelled.";
    const short = (error as { shortMessage?: unknown }).shortMessage;
    return typeof short === "string" ? short : error.message;
  }
  return String(error);
}

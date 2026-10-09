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
    // viem's RPC errors carry a fixed, generic `shortMessage` per error code
    // ("Missing or invalid parameters.") and put the node's actual reason in
    // `details`. The reason is the useful part, so it goes on screen too.
    const { shortMessage, details } = error as { shortMessage?: unknown; details?: unknown };
    if (typeof shortMessage !== "string") return error.message;
    const first = shortMessage.split("\n")[0] ?? shortMessage;
    return typeof details === "string" && details && !first.includes(details) ? `${first} ${details}` : first;
  }
  return String(error);
}

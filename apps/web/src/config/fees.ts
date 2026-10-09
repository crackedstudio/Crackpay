/**
 * Whether Circle's gas sponsorship is paused, so each user pays their own
 * network fee (about a cent) in USDC. Set NEXT_PUBLIC_FREE_FEES_PAUSED=1 while
 * it is, and remove it once Circle is back.
 *
 * This only changes what screens say about fees. Who actually pays is decided
 * per transaction in lib/userop.ts, which always tries sponsorship first.
 */
export const FREE_FEES_PAUSED = process.env.NEXT_PUBLIC_FREE_FEES_PAUSED === "1";

/** The network fee as a confirmation screen states it. */
export const NETWORK_FEE = FREE_FEES_PAUSED ? "About 1¢" : "Free";

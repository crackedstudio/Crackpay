import type { Address } from "viem";

/**
 * A handle chosen at sign-up that is not registered yet, because registering
 * costs a network fee and, while Circle's sponsorship is paused, a brand-new
 * account has nothing to pay it with. Kept on this device, per account, until
 * the account can pay and claims it.
 *
 * Nothing reserves it: until it is registered on-chain, someone else can take
 * it, and claiming then fails like any other taken handle.
 */
const key = (account: Address) => `crackpay:pending-handle:${account.toLowerCase()}`;

export function loadPendingHandle(account: Address): string | null {
  try {
    return window.localStorage.getItem(key(account));
  } catch {
    return null;
  }
}

export function savePendingHandle(account: Address, handle: string | null): void {
  try {
    if (handle) window.localStorage.setItem(key(account), handle);
    else window.localStorage.removeItem(key(account));
  } catch {
    // Storage can be unavailable (private mode). The user picks the handle again.
  }
}

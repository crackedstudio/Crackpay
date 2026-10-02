import type { Address, Hex } from "viem";
import { ONBOARDING_MODE } from "../../config/onboarding";
import { ApiError } from "./errors";
import { clientIp, requirePhone } from "./http";
import type { IdentityDeps } from "./identity-service";
import { accountLookup } from "./phone";

/**
 * The key an identity is filed under. In phone mode it comes from the verified
 * phone cookie. In passkey mode there is no phone, so it is derived from the
 * account, and sign-ups are limited per IP instead of per number.
 */
export async function registrantLookup(deps: IdentityDeps, request: Request, account: Address): Promise<Hex> {
  if (ONBOARDING_MODE === "phone") return (await requirePhone()).phoneLookup as Hex;

  if (!(await deps.store.hit(`signup:ip:${clientIp(request)}`, 60 * 60, 20))) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Wait a while and try again.");
  }
  return accountLookup(deps.pepper, account);
}

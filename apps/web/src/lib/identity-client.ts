import type { Address } from "viem";
import { ONBOARDING_MODE } from "../config/onboarding";
import { api } from "./api";

/**
 * Tells CrackPay's backend about a registration the chain already shows. In
 * passkey mode nothing reads that record back (handles come from the chain),
 * so if recording it fails the registration still counts and the error is
 * logged. In phone mode the same call issues the session, so it must succeed.
 */
export async function recordRegistration(account: Address): Promise<void> {
  try {
    await api.post("/api/identity/confirm", { account });
  } catch (error) {
    if (ONBOARDING_MODE === "phone") throw error;
    console.error("[crackpay] registered on-chain, but recording it failed", error);
  }
}

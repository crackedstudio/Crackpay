import { isAddressEqual, zeroAddress, type Address } from "viem";
import { ONBOARDING_MODE } from "../config/onboarding";
import { identityRegistryAbi } from "../config/identity";
import { InvalidRecipientError, parseRecipient } from "./address";
import { api, ApiClientError } from "./api";
import { arcContracts, publicClient } from "./arc";
import { shortAddress } from "./format";
import { isValidHandle, normalizeHandle } from "./handle";

export type Recipient = { address: Address; label: string };

const registry = { address: arcContracts.identityRegistry, abi: identityRegistryAbi } as const;

export type RecipientKind = "address" | "phone" | "handle";

export function recipientKind(input: string): RecipientKind {
  const value = input.trim();
  if (/^0x/i.test(value)) return "address";
  if (/^\+?[\d\s\-().]+$/.test(value)) return "phone";
  return "handle";
}

/** Turns a handle, a phone number or an address into someone to pay. */
export async function resolveRecipient(input: string): Promise<Recipient> {
  const kind = recipientKind(input);
  if (process.env.NEXT_PUBLIC_DEMO === "1") return { address: "0x00000000000000000000000000000000000000aa" as Address, label: input.startsWith("@") ? input : "@" + input };

  if (kind === "address") {
    const address = parseRecipient(input);
    const handle = await publicClient.readContract({ ...registry, functionName: "reverse", args: [address] });
    return { address, label: handle ? `@${handle}` : shortAddress(address) };
  }

  if (kind === "phone") {
    if (ONBOARDING_MODE !== "phone") {
      throw new InvalidRecipientError("Paying by phone number isn't available yet. Use a handle or an address.");
    }
    try {
      const found = await api.post<{ account: Address; handle: string }>("/api/resolve", { phone: input });
      return { address: parseRecipient(found.account), label: `@${found.handle}` };
    } catch (error) {
      if (error instanceof ApiClientError) throw new InvalidRecipientError(error.message);
      throw error;
    }
  }

  const handle = normalizeHandle(input);
  if (!isValidHandle(handle)) throw new InvalidRecipientError("That doesn't look like a handle, a phone number or an address.");
  const address = await publicClient.readContract({ ...registry, functionName: "resolveHandle", args: [handle] });
  if (isAddressEqual(address, zeroAddress)) throw new InvalidRecipientError(`Nobody on CrackPay is called @${handle}.`);
  return { address, label: `@${handle}` };
}

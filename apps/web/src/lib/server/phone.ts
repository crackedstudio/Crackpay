import { createHmac, randomBytes } from "node:crypto";
import { concat, keccak256, type Hex } from "viem";
import { ApiError } from "./errors";

// Phone numbers are never stored. The database keeps two derived values:
//  - phoneLookup: HMAC(pepper, number). Lets the server find a user by number.
//    Useless without the pepper, which lives only in the server environment.
//  - phoneHash: keccak256(salt ‖ phoneLookup) with a random per-user salt. This
//    is what goes on-chain. Without both the pepper and the salt, a list of
//    numbers cannot be matched against the registry.

/** Strips formatting and requires E.164: "+" then 8 to 15 digits. */
export function normalizePhone(input: string): string {
  const phone = input.replace(/[\s\-().]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new ApiError(400, "invalid_phone", "Enter the number with its country code, like +2348012345678");
  }
  return phone;
}

export function phoneLookup(pepper: string, phone: string): Hex {
  return `0x${createHmac("sha256", pepper).update(phone).digest("hex")}`;
}

export function newSalt(): Hex {
  return `0x${randomBytes(32).toString("hex")}`;
}

export function phoneHash(salt: Hex, lookup: Hex): Hex {
  return keccak256(concat([salt, lookup]));
}

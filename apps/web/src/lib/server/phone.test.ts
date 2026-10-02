import { describe, expect, it } from "vitest";
import { accountLookup, newSalt, normalizePhone, phoneHash, phoneLookup } from "./phone";

const ACCOUNT = "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62";

describe("lookup keys", () => {
  it("derives the same account key whatever the address casing", () => {
    expect(accountLookup("pepper", ACCOUNT)).toBe(accountLookup("pepper", ACCOUNT.toLowerCase()));
    expect(accountLookup("pepper", ACCOUNT)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("depends on the pepper", () => {
    expect(accountLookup("pepper", ACCOUNT)).not.toBe(accountLookup("other", ACCOUNT));
    expect(phoneLookup("pepper", "+2348012345678")).not.toBe(phoneLookup("other", "+2348012345678"));
  });

  it("keeps account keys and phone keys in separate namespaces", () => {
    // Account keys hash "account:<address>". A phone key hashes a normalised number,
    // and normalisation only lets "+digits" through, so the two can never coincide.
    expect(phoneLookup("pepper", ACCOUNT.toLowerCase())).not.toBe(accountLookup("pepper", ACCOUNT));
    expect(() => normalizePhone(`account:${ACCOUNT.toLowerCase()}`)).toThrow();
  });

  it("salts the on-chain hash per user", () => {
    const lookup = phoneLookup("pepper", "+2348012345678");
    expect(phoneHash(newSalt(), lookup)).not.toBe(phoneHash(newSalt(), lookup));
  });
});

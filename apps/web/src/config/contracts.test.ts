import { describe, expect, it } from "vitest";
import { isAddress } from "viem";
import { contracts } from "./contracts";

describe("contract addresses", () => {
  it("are valid checksummed addresses on every chain", () => {
    for (const addresses of Object.values(contracts)) {
      for (const address of Object.values(addresses)) {
        expect(isAddress(address, { strict: true })).toBe(true);
      }
    }
  });
});

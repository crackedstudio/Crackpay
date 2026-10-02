import { describe, expect, it } from "vitest";
import { InvalidRecipientError, parseRecipient } from "./address";

describe("parseRecipient", () => {
  it("accepts a checksummed address and trims whitespace", () => {
    const address = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
    expect(parseRecipient(`  ${address} `)).toBe(address);
  });

  it("rejects the zero address", () => {
    expect(() => parseRecipient("0x0000000000000000000000000000000000000000")).toThrow(
      InvalidRecipientError,
    );
  });

  it.each(["", "0x123", "not an address", "0x89B50855aa3bE2F677cD6303Cec089B5F319D72a"])(
    "rejects %j",
    (input) => {
      expect(() => parseRecipient(input)).toThrow(InvalidRecipientError);
    },
  );
});

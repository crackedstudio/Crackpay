import { isAddress, zeroAddress, type Address } from "viem";

export class InvalidRecipientError extends Error {
  override name = "InvalidRecipientError";
}

/** Arc reverts transfers to address(0), so reject it before building anything. */
export function parseRecipient(input: string): Address {
  const value = input.trim();
  if (!isAddress(value)) {
    throw new InvalidRecipientError(`Not a valid address: ${input}`);
  }
  if (value === zeroAddress) {
    throw new InvalidRecipientError("Cannot send to the zero address");
  }
  return value;
}

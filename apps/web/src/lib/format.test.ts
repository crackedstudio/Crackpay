import { InvalidInputRpcError } from "viem";
import { describe, expect, it, vi } from "vitest";
import { errorText } from "./format";

describe("errorText", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  it("shows the node's reason, not only viem's generic line for the error code", () => {
    // What Circle's bundler answer becomes once viem has wrapped it.
    const error = new InvalidInputRpcError(new Error("precheck failed: sender balance too low"));
    expect(errorText(error)).toMatch(/^Missing or invalid parameters\. .*precheck failed: sender balance too low/);
  });

  it("reads a plain error and a cancelled passkey prompt", () => {
    expect(errorText(new Error("Nope"))).toBe("Nope");
    expect(errorText(Object.assign(new Error("x"), { name: "NotAllowedError" }))).toBe("The passkey request was cancelled.");
  });
});

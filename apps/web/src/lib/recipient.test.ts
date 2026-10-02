import { describe, expect, it } from "vitest";
import { recipientKind } from "./recipient";

describe("recipientKind", () => {
  it.each([
    ["0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", "address"],
    ["0X89b5", "address"],
    ["+2348012345678", "phone"],
    ["+234 801 234-5678", "phone"],
    ["08012345678", "phone"],
    ["(080) 1234.5678", "phone"],
    ["sam", "handle"],
    ["@sam_01", "handle"],
    ["sam01", "handle"],
  ] as const)("classifies %j as %s", (input, kind) => {
    expect(recipientKind(input)).toBe(kind);
  });
});

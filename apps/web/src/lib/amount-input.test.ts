import { describe, expect, it } from "vitest";
import { isAmountKey, pressAmountKey } from "./amount-input";
import { parseAmount } from "./money";

describe("pressAmountKey", () => {
  it("builds up a whole number", () => {
    expect(["1", "2", "5"].reduce(pressAmountKey, "")).toBe("125");
  });

  it("replaces a lone placeholder zero rather than growing it", () => {
    expect(pressAmountKey("0", "5")).toBe("5");
    expect(pressAmountKey("0.", "5")).toBe("0.5");
  });

  it("starts a decimal from nothing with a leading zero", () => {
    expect(pressAmountKey("", ".")).toBe("0.");
  });

  it("allows only one decimal point", () => {
    expect(pressAmountKey("12.5", ".")).toBe("12.5");
  });

  it("stops at the six decimals USDC has", () => {
    const six = "1.234567";
    expect(pressAmountKey(six, "8")).toBe(six);
    // Whatever the keypad produces must survive parsing.
    expect(() => parseAmount(six)).not.toThrow();
  });

  it("caps the whole part", () => {
    const nine = "123456789";
    expect(pressAmountKey(nine, "1")).toBe(nine);
    // The cap applies to the whole part only; cents still work.
    expect(pressAmountKey(`${nine}.`, "5")).toBe(`${nine}.5`);
  });

  it("deletes the last character, including the decimal point", () => {
    expect(pressAmountKey("12.5", "del")).toBe("12.");
    expect(pressAmountKey("12.", "del")).toBe("12");
    expect(pressAmountKey("", "del")).toBe("");
  });

  it("ignores anything that is not a key", () => {
    expect(pressAmountKey("12", "a")).toBe("12");
    expect(pressAmountKey("12", "-")).toBe("12");
  });

  it("recognises its own keys", () => {
    expect(isAmountKey("7")).toBe(true);
    expect(isAmountKey("del")).toBe(true);
    expect(isAmountKey("Enter")).toBe(false);
  });
});

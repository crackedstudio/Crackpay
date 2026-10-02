import { describe, expect, it } from "vitest";
import {
  MoneyError,
  baseToNative,
  formatAmount,
  formatAmountExact,
  nativeDust,
  nativeToBase,
  nativeToBaseCeil,
  parseAmount,
  toInputValue,
  type MoneyErrorCode,
} from "./money";

function errorCode(fn: () => unknown): MoneyErrorCode | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof MoneyError) return error.code;
    throw error;
  }
  return undefined;
}

describe("6 ↔ 18 decimal conversion", () => {
  it("converts one USDC in both directions", () => {
    expect(nativeToBase(1_000_000_000_000_000_000n)).toBe(1_000_000n);
    expect(baseToNative(1_000_000n)).toBe(1_000_000_000_000_000_000n);
  });

  it("converts the smallest base unit", () => {
    expect(baseToNative(1n)).toBe(1_000_000_000_000n);
    expect(nativeToBase(1_000_000_000_000n)).toBe(1n);
  });

  it("handles zero", () => {
    expect(nativeToBase(0n)).toBe(0n);
    expect(baseToNative(0n)).toBe(0n);
  });

  it("round-trips base → native → base exactly", () => {
    for (const base of [1n, 999_999n, 1_000_001n, 123_456_789_012n]) {
      expect(nativeToBase(baseToNative(base))).toBe(base);
    }
  });

  it("truncates native dust instead of rounding up", () => {
    expect(nativeToBase(999_999_999_999n)).toBe(0n);
    expect(nativeToBase(1_999_999_999_999n)).toBe(1n);
    expect(nativeToBase(1_500_000_999_999_999_999n)).toBe(1_500_000n);
  });

  it("reports the dust that truncation drops", () => {
    const native = 1_500_000_999_999_999_999n;
    expect(nativeDust(native)).toBe(999_999_999_999n);
    expect(baseToNative(nativeToBase(native)) + nativeDust(native)).toBe(native);
  });

  it("rounds up when asked, so a cost is never understated", () => {
    expect(nativeToBaseCeil(0n)).toBe(0n);
    expect(nativeToBaseCeil(1n)).toBe(1n);
    expect(nativeToBaseCeil(1_000_000_000_000n)).toBe(1n);
    expect(nativeToBaseCeil(1_000_000_000_001n)).toBe(2n);
    expect(errorCode(() => nativeToBaseCeil(-1n))).toBe("NEGATIVE");
  });

  it("stays exact beyond Number.MAX_SAFE_INTEGER", () => {
    const base = 9_007_199_254_740_993_000_000n;
    expect(nativeToBase(baseToNative(base))).toBe(base);
  });

  it("rejects negative amounts", () => {
    expect(errorCode(() => nativeToBase(-1n))).toBe("NEGATIVE");
    expect(errorCode(() => baseToNative(-1n))).toBe("NEGATIVE");
    expect(errorCode(() => nativeDust(-1n))).toBe("NEGATIVE");
  });
});

describe("parseAmount", () => {
  it.each([
    ["1", 1_000_000n],
    ["0", 0n],
    ["0.1", 100_000n],
    ["1.5", 1_500_000n],
    [".5", 500_000n],
    ["5.", 5_000_000n],
    ["0.000001", 1n],
    ["12.345678", 12_345_678n],
    ["1,000.25", 1_000_250_000n],
    ["  2.50  ", 2_500_000n],
    ["007", 7_000_000n],
  ])("parses %j", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it("avoids float error on classic cases", () => {
    expect(parseAmount("0.1") + parseAmount("0.2")).toBe(parseAmount("0.3"));
    expect(parseAmount("1.005")).toBe(1_005_000n);
  });

  it("parses amounts too large for a double", () => {
    expect(parseAmount("9007199254740993.000001")).toBe(
      9_007_199_254_740_993_000_001n,
    );
  });

  it("rejects more than 6 decimals rather than rounding", () => {
    expect(errorCode(() => parseAmount("0.0000001"))).toBe("TOO_MANY_DECIMALS");
    expect(errorCode(() => parseAmount("1.1234567"))).toBe("TOO_MANY_DECIMALS");
  });

  it.each(["", "   "])("rejects empty input %j", (input) => {
    expect(errorCode(() => parseAmount(input))).toBe("EMPTY");
  });

  it.each(["-1", "-0.5"])("rejects negative input %j", (input) => {
    expect(errorCode(() => parseAmount(input))).toBe("NEGATIVE");
  });

  it.each([".", "abc", "1.2.3", "1e6", "0x10", "$5", "1 000", "+1", "١٢"])(
    "rejects malformed input %j",
    (input) => {
      expect(errorCode(() => parseAmount(input))).toBe("INVALID_FORMAT");
    },
  );
});

describe("formatAmount", () => {
  it.each([
    [0n, "0.00"],
    [1n, "0.00"],
    [10_000n, "0.01"],
    [1_000_000n, "1.00"],
    [1_500_000n, "1.50"],
    [1_234_567_890n, "1,234.56"],
    [1_000_000_000_000n, "1,000,000.00"],
  ])("formats %s as %s", (base, expected) => {
    expect(formatAmount(base)).toBe(expected);
  });

  it("rounds down, never up", () => {
    expect(formatAmount(1_999_999n)).toBe("1.99");
    expect(formatAmount(999_999n)).toBe("0.99");
    expect(formatAmount(1_005_000n)).toBe("1.00");
  });

  it("supports other decimal counts", () => {
    expect(formatAmount(1_234_567n, 0)).toBe("1");
    expect(formatAmount(1_234_567n, 4)).toBe("1.2345");
    expect(formatAmount(1_234_567n, 6)).toBe("1.234567");
  });

  it("rejects an invalid decimal count", () => {
    expect(() => formatAmount(1n, 7)).toThrow(RangeError);
    expect(() => formatAmount(1n, -1)).toThrow(RangeError);
    expect(() => formatAmount(1n, 1.5)).toThrow(RangeError);
  });

  it("rejects negative amounts", () => {
    expect(errorCode(() => formatAmount(-1n))).toBe("NEGATIVE");
  });
});

describe("formatAmountExact", () => {
  it.each([
    [0n, "0.00"],
    [1n, "0.000001"],
    [1_000_000n, "1.00"],
    [1_500_000n, "1.50"],
    [1_230_000n, "1.23"],
    [1_234_500n, "1.2345"],
    [1_234_567_891n, "1,234.567891"],
  ])("formats %s as %s", (base, expected) => {
    expect(formatAmountExact(base)).toBe(expected);
  });

  it("round-trips through parseAmount", () => {
    for (const base of [0n, 1n, 999_999n, 1_000_000n, 98_765_432_109_876n]) {
      expect(parseAmount(formatAmountExact(base))).toBe(base);
    }
  });
});

describe("toInputValue", () => {
  it("is a plain decimal with no grouping, ready to type on from", () => {
    expect(toInputValue(20_000_000n)).toBe("20");
    expect(toInputValue(1_234_500_000n)).toBe("1234.5");
    expect(toInputValue(1n)).toBe("0.000001");
    expect(toInputValue(0n)).toBe("0");
  });

  it("round-trips through parseAmount", () => {
    for (const base of [0n, 1n, 500_000n, 12_340_000n, 999_999_999_999n]) {
      expect(parseAmount(toInputValue(base))).toBe(base);
    }
  });

  it("refuses a negative amount", () => {
    expect(() => toInputValue(-1n)).toThrow(MoneyError);
  });
});

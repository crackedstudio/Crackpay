// The only home for decimal conversion. Amounts everywhere else are bigint
// base units at 6 decimals (1 USDC = 1_000_000n). Never a number, never a float.
//
// Arc exposes one USDC balance through two interfaces: native (18 decimals)
// and ERC-20 (6 decimals). Convert at the RPC boundary with the helpers below.

export const USDC_DECIMALS = 6;
export const NATIVE_DECIMALS = 18;

const BASE_UNIT = 10n ** BigInt(USDC_DECIMALS);
const NATIVE_PER_BASE = 10n ** BigInt(NATIVE_DECIMALS - USDC_DECIMALS);

export type MoneyErrorCode =
  | "EMPTY"
  | "INVALID_FORMAT"
  | "TOO_MANY_DECIMALS"
  | "NEGATIVE";

export class MoneyError extends Error {
  override name = "MoneyError";
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function assertNonNegative(amount: bigint): void {
  if (amount < 0n) {
    throw new MoneyError("NEGATIVE", `Amount cannot be negative: ${amount}`);
  }
}

/**
 * Native 18-decimal balance → 6-decimal base units. Truncates anything below
 * one base unit, matching what the ERC-20 `balanceOf` view reports, so the
 * result never overstates what can be spent through the ERC-20 interface.
 */
export function nativeToBase(native: bigint): bigint {
  assertNonNegative(native);
  return native / NATIVE_PER_BASE;
}

/** The sub-base-unit remainder that `nativeToBase` drops, in native units. */
export function nativeDust(native: bigint): bigint {
  assertNonNegative(native);
  return native % NATIVE_PER_BASE;
}

/** 6-decimal base units → native 18-decimal units. Exact. */
export function baseToNative(base: bigint): bigint {
  assertNonNegative(base);
  return base * NATIVE_PER_BASE;
}

/**
 * Parses what a user typed ("12", "12.5", ".5", "1,000.25") into base units.
 * Rejects rather than rounds: more than 6 decimal places is an error.
 */
export function parseAmount(input: string): bigint {
  const text = input.trim().replace(/,/g, "");
  if (text === "") throw new MoneyError("EMPTY", "Amount is empty");
  if (text.startsWith("-")) {
    throw new MoneyError("NEGATIVE", `Amount cannot be negative: ${input}`);
  }

  const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
  const whole = match?.[1] ?? "";
  const fraction = match?.[2] ?? "";
  if (!match || (whole === "" && fraction === "")) {
    throw new MoneyError("INVALID_FORMAT", `Not a valid amount: ${input}`);
  }
  if (fraction.length > USDC_DECIMALS) {
    throw new MoneyError(
      "TOO_MANY_DECIMALS",
      `Amount has more than ${USDC_DECIMALS} decimal places: ${input}`,
    );
  }

  return (
    BigInt(whole || "0") * BASE_UNIT +
    BigInt(fraction.padEnd(USDC_DECIMALS, "0") || "0")
  );
}

function group(whole: bigint): string {
  return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Display string with a fixed number of decimals (default 2): "1,234.56".
 * Rounds down, so a balance is never shown as more than it is.
 */
export function formatAmount(base: bigint, decimals = 2): string {
  assertNonNegative(base);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > USDC_DECIMALS) {
    throw new RangeError(`decimals must be an integer from 0 to ${USDC_DECIMALS}`);
  }

  const whole = group(base / BASE_UNIT);
  if (decimals === 0) return whole;

  const fraction = (base % BASE_UNIT)
    .toString()
    .padStart(USDC_DECIMALS, "0")
    .slice(0, decimals);
  return `${whole}.${fraction}`;
}

/**
 * Full-precision display with no rounding: at least 2 decimals, up to 6,
 * trailing zeros trimmed. For receipts and confirm screens.
 */
export function formatAmountExact(base: bigint): string {
  assertNonNegative(base);
  const fraction = (base % BASE_UNIT)
    .toString()
    .padStart(USDC_DECIMALS, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return `${group(base / BASE_UNIT)}.${fraction}`;
}

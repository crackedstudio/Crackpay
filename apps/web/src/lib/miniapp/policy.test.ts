import { encodeFunctionData, erc20Abi, type Address } from "viem";
import { describe, expect, it } from "vitest";
import { RpcError } from "./errors";
import { checkTransaction, type Policy } from "./policy";

const ESCROW: Address = "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62";
const EURC: Address = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
const STRANGER: Address = "0x1111111111111111111111111111111111111111";

const policy: Policy = { contracts: [ESCROW], tokens: [{ symbol: "EURC", address: EURC }] };

const approve = (spender: Address, amount: bigint) =>
  encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] });

function code(fn: () => unknown): number | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof RpcError) return error.code;
    throw error;
  }
  return undefined;
}

describe("checkTransaction", () => {
  it("allows a call to the app's own contract, with its value", () => {
    expect(checkTransaction(policy, { to: ESCROW, data: "0x1234", value: 5n })).toEqual({
      kind: "contract",
      to: ESCROW,
      value: 5n,
    });
  });

  it("matches addresses regardless of case", () => {
    const lower = ESCROW.toLowerCase() as Address;
    expect(checkTransaction(policy, { to: lower, data: "0x", value: 0n }).kind).toBe("contract");
  });

  it("refuses a contract that is not listed", () => {
    expect(code(() => checkTransaction(policy, { to: STRANGER, data: "0x", value: 0n }))).toBe(4100);
  });

  it("allows approving the app's contract to spend a listed token", () => {
    expect(checkTransaction(policy, { to: EURC, data: approve(ESCROW, 2_500_000n), value: 0n })).toEqual({
      kind: "approve",
      token: { symbol: "EURC", address: EURC },
      spender: ESCROW,
      amount: 2_500_000n,
    });
  });

  it("refuses an approval to any other spender", () => {
    expect(code(() => checkTransaction(policy, { to: EURC, data: approve(STRANGER, 1n), value: 0n }))).toBe(4100);
  });

  it("refuses token transfers", () => {
    const transfer = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [STRANGER, 1n] });
    expect(code(() => checkTransaction(policy, { to: EURC, data: transfer, value: 0n }))).toBe(4100);

    const transferFrom = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transferFrom",
      args: [STRANGER, ESCROW, 1n],
    });
    expect(code(() => checkTransaction(policy, { to: EURC, data: transferFrom, value: 0n }))).toBe(4100);
  });

  it("refuses token calls it cannot decode", () => {
    expect(code(() => checkTransaction(policy, { to: EURC, data: "0xdeadbeef", value: 0n }))).toBe(-32602);
    expect(code(() => checkTransaction(policy, { to: EURC, data: "0x", value: 0n }))).toBe(-32602);
  });

  it("refuses a token call that carries a payment", () => {
    expect(code(() => checkTransaction(policy, { to: EURC, data: approve(ESCROW, 1n), value: 1n }))).toBe(4100);
  });
});

describe("unrestricted (Developer mode) policy", () => {
  const open: Policy = { contracts: [], tokens: [{ symbol: "EURC", address: EURC }], unrestricted: true };

  it("allows any contract and reports the exact target and value", () => {
    expect(checkTransaction(open, { to: STRANGER, data: "0x1234", value: 7n })).toEqual({
      kind: "contract",
      to: STRANGER,
      value: 7n,
    });
  });

  it("describes token approvals and transfers with their real counterparty", () => {
    expect(checkTransaction(open, { to: EURC, data: approve(STRANGER, 5n), value: 0n })).toEqual({
      kind: "approve",
      token: { symbol: "EURC", address: EURC },
      spender: STRANGER,
      amount: 5n,
    });
    const transfer = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [STRANGER, 9n] });
    expect(checkTransaction(open, { to: EURC, data: transfer, value: 0n })).toEqual({
      kind: "transfer",
      token: { symbol: "EURC", address: EURC },
      to: STRANGER,
      amount: 9n,
    });
  });

  it("falls back to a raw contract call for token calls it cannot describe", () => {
    expect(checkTransaction(open, { to: EURC, data: "0xdeadbeef", value: 0n }).kind).toBe("contract");
    expect(checkTransaction(open, { to: EURC, data: approve(STRANGER, 1n), value: 1n }).kind).toBe("contract");
  });

  it("does not loosen a listed app's policy", () => {
    expect(code(() => checkTransaction(policy, { to: STRANGER, data: "0x", value: 0n }))).toBe(4100);
  });
});

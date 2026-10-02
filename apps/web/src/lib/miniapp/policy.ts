import { decodeFunctionData, erc20Abi, isAddressEqual, type Address, type Hex } from "viem";
import { invalidParams, unauthorized } from "./errors";

export type TransactionRequest = { to: Address; data: Hex; value: bigint };

export type Token = { symbol: string; address: Address };

/** What the user is asked to approve, in terms they can check. */
export type TransactionSummary =
  | { kind: "contract"; to: Address; /** Native 18-decimal USDC sent with the call. */ value: bigint }
  | { kind: "approve"; token: Token; spender: Address; /** 6-decimal base units. */ amount: bigint };

export type Policy = {
  /** Contracts this Mini App may call. */
  contracts: readonly Address[];
  /** Tokens it may ask for an allowance on, and only for one of `contracts`. */
  tokens: readonly Token[];
};

const includes = (list: readonly Address[], address: Address) =>
  list.some((entry) => isAddressEqual(entry, address));

/**
 * Decides whether a Mini App may send this transaction. Only its own listed
 * contracts can be called. A token contract can be called for exactly one
 * thing: approving one of those contracts to spend it. Anything else, such as
 * a token transfer or an approval to an unknown spender, is refused.
 */
export function checkTransaction(policy: Policy, tx: TransactionRequest): TransactionSummary {
  if (includes(policy.contracts, tx.to)) {
    return { kind: "contract", to: tx.to, value: tx.value };
  }

  const token = policy.tokens.find((entry) => isAddressEqual(entry.address, tx.to));
  if (!token) throw unauthorized(`This app is not allowed to call ${tx.to}`);
  if (tx.value !== 0n) throw unauthorized("A token call cannot carry a payment");

  let call: ReturnType<typeof decodeFunctionData<typeof erc20Abi>>;
  try {
    call = decodeFunctionData({ abi: erc20Abi, data: tx.data });
  } catch {
    throw invalidParams("Unrecognised token call");
  }
  if (call.functionName !== "approve") {
    throw unauthorized(`This app is not allowed to call ${token.symbol}.${call.functionName}`);
  }

  const [spender, amount] = call.args;
  if (!includes(policy.contracts, spender)) {
    throw unauthorized(`This app cannot approve ${spender} to spend ${token.symbol}`);
  }
  return { kind: "approve", token, spender, amount };
}

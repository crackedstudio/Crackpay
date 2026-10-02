import { isAddress, isAddressEqual, isHex, zeroAddress, type Address, type Hash, type Hex } from "viem";
import { RpcError, invalidParams, unsupported, userRejected } from "./errors";
import type { TransactionRequest, TransactionSummary } from "./policy";

/** Read-only node methods a Mini App may reach through the wallet. */
const READ_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
]);

export type BridgeDeps = {
  chainId: number;
  account: Address;
  /** Applies the Mini App's policy. Throws an RpcError to refuse. */
  check(tx: TransactionRequest): TransactionSummary;
  /** Shows the request in the CrackPay page, never inside the iframe. */
  confirm(summary: TransactionSummary): Promise<boolean>;
  /** Sends a sponsored userOp. `success` is false when the call itself reverted. */
  send(tx: TransactionRequest): Promise<{ transactionHash: Hash; success: boolean }>;
  /** Forwards a read-only method to the node. */
  read(method: string, params: unknown): Promise<unknown>;
};

const toHexChainId = (chainId: number) => `0x${chainId.toString(16)}`;

function firstParam(params: unknown): Record<string, unknown> {
  const first = Array.isArray(params) ? (params[0] as unknown) : undefined;
  if (typeof first !== "object" || first === null) throw invalidParams("Expected an object parameter");
  return first as Record<string, unknown>;
}

function requestedChainId(params: unknown): number {
  const { chainId } = firstParam(params);
  if (typeof chainId !== "string" || !isHex(chainId)) throw invalidParams("chainId must be a hex string");
  return Number(BigInt(chainId));
}

function parseTransaction(params: unknown, account: Address): TransactionRequest {
  const tx = firstParam(params);

  if (tx.from !== undefined && !(typeof tx.from === "string" && isAddress(tx.from) && isAddressEqual(tx.from, account))) {
    throw invalidParams("from must be the connected account");
  }
  if (typeof tx.to !== "string" || !isAddress(tx.to)) {
    throw invalidParams("to must be an address; contract creation is not supported");
  }
  // Arc reverts sends to the zero address, so refuse before anything is signed.
  if (isAddressEqual(tx.to, zeroAddress)) throw invalidParams("Cannot send to the zero address");

  const data = tx.data ?? tx.input ?? "0x";
  if (typeof data !== "string" || !isHex(data)) throw invalidParams("data must be a hex string");

  const value = tx.value ?? "0x0";
  if (typeof value !== "string" || !isHex(value)) throw invalidParams("value must be a hex string");

  return { to: tx.to, data: data as Hex, value: BigInt(value) };
}

/** Answers one EIP-1193 request from a Mini App. */
export async function handleRequest(deps: BridgeDeps, method: string, params: unknown): Promise<unknown> {
  switch (method) {
    case "eth_chainId":
      return toHexChainId(deps.chainId);
    case "net_version":
      return String(deps.chainId);

    // Mini Apps are connected from the start: there is no connect prompt.
    case "eth_accounts":
    case "eth_requestAccounts":
      return [deps.account];

    case "wallet_switchEthereumChain":
      if (requestedChainId(params) !== deps.chainId) {
        throw new RpcError(4902, "CrackPay only supports Arc");
      }
      return null;
    case "wallet_addEthereumChain":
      if (requestedChainId(params) !== deps.chainId) {
        throw new RpcError(4200, "CrackPay only supports Arc");
      }
      return null;

    case "eth_sendTransaction": {
      const tx = parseTransaction(params, deps.account);
      const summary = deps.check(tx);
      if (!(await deps.confirm(summary))) throw userRejected();

      const { transactionHash, success } = await deps.send(tx);
      if (!success) throw new RpcError(-32603, `Transaction ${transactionHash} reverted`);
      return transactionHash;
    }

    default:
      if (READ_METHODS.has(method)) return deps.read(method, params);
      throw unsupported(method);
  }
}

/** Turns anything thrown while handling a request into a wire error. */
export function toWireError(error: unknown): { code: number; message: string } {
  if (error instanceof RpcError) return { code: error.code, message: error.message };
  // A dismissed passkey prompt is the user saying no.
  if (error instanceof Error && error.name === "NotAllowedError") {
    return { code: 4001, message: "The user rejected the request" };
  }
  return { code: -32603, message: error instanceof Error ? error.message : "Internal error" };
}

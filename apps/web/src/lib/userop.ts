import { encodeTransfer } from "@circle-fin/modular-wallets-core";
import { encodeFunctionData, type Address, type Hash, type Hex } from "viem";
import { WaitForUserOperationReceiptTimeoutError } from "viem/account-abstraction";
import { contracts } from "../config/contracts";
import { identityRegistryAbi } from "../config/identity";
import { arcChain } from "./arc";
import { createArcBundlerClient, type CrackPaySmartAccount } from "./wallet";

type Call = { to: Address; data?: Hex; value?: bigint };

export type UserOpResult =
  | { status: "confirmed"; userOpHash: Hash; transactionHash: Hash }
  /** Landed on-chain, but the call itself reverted. Nothing moved. */
  | { status: "reverted"; userOpHash: Hash; transactionHash: Hash }
  /**
   * Accepted by the bundler, but no receipt arrived. On Arc a blocklisted
   * transfer burns gas without one. Terminal: never retry automatically.
   */
  | { status: "submitted_no_receipt"; userOpHash: Hash };

// Arc is final in under a second, so a receipt this late is not coming.
const RECEIPT_TIMEOUT_MS = 30_000;

/** Every userOp goes through here so gas is always sponsored. */
export async function sendSponsoredUserOp(account: CrackPaySmartAccount, calls: readonly Call[]): Promise<UserOpResult> {
  const bundler = createArcBundlerClient();
  const userOpHash = await bundler.sendUserOperation({
    account,
    calls: [...calls],
    paymaster: true,
  });

  try {
    const { receipt, success } = await bundler.waitForUserOperationReceipt({
      hash: userOpHash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
    return { status: success ? "confirmed" : "reverted", userOpHash, transactionHash: receipt.transactionHash };
  } catch (error) {
    if (error instanceof WaitForUserOperationReceiptTimeoutError) {
      return { status: "submitted_no_receipt", userOpHash };
    }
    throw error;
  }
}

/** `amount` is 6-decimal base units, which is what the ERC-20 interface takes. */
export function sendUsdc(
  account: CrackPaySmartAccount,
  to: Address,
  amount: bigint,
) {
  const usdc = contracts[arcChain.id].usdc;
  return sendSponsoredUserOp(account, [encodeTransfer(to, usdc, amount)]);
}

/** Registers the account in IdentityRegistry using a backend attestation. */
export function registerIdentity(
  account: CrackPaySmartAccount,
  attestation: { phoneHash: Hex; handle: string; deadline: number; signature: Hex },
) {
  const data = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: "register",
    args: [attestation.phoneHash, attestation.handle, BigInt(attestation.deadline), attestation.signature],
  });
  return sendSponsoredUserOp(account, [{ to: contracts[arcChain.id].identityRegistry, data }]);
}

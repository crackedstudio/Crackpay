import { encodeTransfer } from "@circle-fin/modular-wallets-core";
import { encodeFunctionData, parseGwei, type Address, type Hash, type Hex } from "viem";
import {
  WaitForUserOperationReceiptTimeoutError,
  formatUserOperationRequest,
  type UserOperation,
} from "viem/account-abstraction";
import { identityRegistryAbi } from "../config/identity";
import { arcContracts, publicClient } from "./arc";
import { baseToNative, formatAmount, nativeToBaseCeil } from "./money";
import { createArcBundlerClient, type CrackPaySmartAccount } from "./wallet";

type Call = { to: Address; data?: Hex; value?: bigint };

/**
 * Who paid the network fee. `self` means Circle's sponsorship was unavailable
 * and the fee came out of the account's own USDC; `fee` is what it cost, in
 * 6-decimal base units, once the receipt says so.
 */
export type GasPayment = { sponsored: true } | { sponsored: false; fee?: bigint };

export type UserOpResult =
  | { status: "confirmed"; userOpHash: Hash; transactionHash: Hash; gas: GasPayment }
  /** Landed on-chain, but the call itself reverted. Nothing moved. */
  | { status: "reverted"; userOpHash: Hash; transactionHash: Hash; gas: GasPayment }
  /**
   * Accepted by the bundler, but no receipt arrived. On Arc a blocklisted
   * transfer burns gas without one. Terminal: never retry automatically.
   */
  | { status: "submitted_no_receipt"; userOpHash: Hash; gas: GasPayment };

/**
 * Sponsorship is unavailable and the account cannot pay the fee itself.
 * Thrown before the passkey prompt, so nothing was signed or sent.
 */
export class GasFundsError extends Error {
  override name = "GasFundsError";
  constructor(
    /** The fee this transaction needs, in 6-decimal base units. */
    readonly fee: bigint,
  ) {
    super(
      `Free network fees are paused for now, so this needs about $${formatAmount(fee)} for the fee, and the account is short. Add money, or send a little less.`,
    );
  }
}

// Arc is final in under a second, so a receipt this late is not coming.
const RECEIPT_TIMEOUT_MS = 30_000;

// Arc's mempool rejects a maxFeePerGas under 20 gwei, whatever the estimate says.
const FEE_FLOOR = parseGwei("20");

/** Fees for a userOp the account pays for itself, clamped up to Arc's floor. */
async function selfPaidFees() {
  const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
  const max = maxFeePerGas > FEE_FLOOR ? maxFeePerGas : FEE_FLOOR;
  return { maxFeePerGas: max, maxPriorityFeePerGas: maxPriorityFeePerGas > max ? max : maxPriorityFeePerGas };
}

/** The most this userOp can cost, in native 18-decimal units (the EntryPoint's prefund). */
function maxCost(op: UserOperation): bigint {
  const gas =
    op.callGasLimit +
    op.verificationGasLimit +
    op.preVerificationGas +
    (op.paymasterVerificationGasLimit ?? 0n) +
    (op.paymasterPostOpGasLimit ?? 0n);
  return gas * op.maxFeePerGas;
}

/**
 * Builds the userOp with Circle's sponsorship, and if Circle will not sponsor
 * it (its paymaster is paused during an incident, for one), builds it again to
 * be paid from the account's own USDC. Both happen before anything is signed.
 */
async function prepare(account: CrackPaySmartAccount, calls: readonly Call[], spend: bigint) {
  const bundler = createArcBundlerClient();
  try {
    const op = await bundler.prepareUserOperation({ account, calls: [...calls], paymaster: true });
    return { bundler, op: op as UserOperation, sponsored: true as const };
  } catch (sponsorError) {
    // Logged, not swallowed: if the fallback fails too, this is the first clue.
    console.error("[crackpay] gas sponsorship unavailable; the account pays its own fee", sponsorError);
  }

  const op = (await bundler.prepareUserOperation({
    account,
    calls: [...calls],
    ...(await selfPaidFees()),
  })) as UserOperation;
  // The fee and the payment come out of the same USDC balance, and the fee is
  // taken first: if both do not fit, the payment would revert with the fee spent.
  const cost = maxCost(op);
  const native = calls.reduce((sum, call) => sum + (call.value ?? 0n), 0n);
  if ((await publicClient.getBalance({ address: account.address })) < cost + native + baseToNative(spend)) {
    throw new GasFundsError(nativeToBaseCeil(cost));
  }
  return { bundler, op, sponsored: false as const };
}

/**
 * Every userOp goes through here. Gas is sponsored whenever Circle will
 * sponsor it; while it will not, the account pays the fee in USDC.
 *
 * `spend` is USDC the calls move through its ERC-20 interface, in 6-decimal
 * base units: the same balance the fee comes from. Native `value` is counted
 * from the calls themselves.
 */
export async function sendUserOp(
  account: CrackPaySmartAccount,
  calls: readonly Call[],
  spend = 0n,
): Promise<UserOpResult> {
  const { bundler, op, sponsored } = await prepare(account, calls, spend);
  const signature = await account.signUserOperation(op);
  const userOpHash = await bundler.request({
    method: "eth_sendUserOperation",
    params: [formatUserOperationRequest({ ...op, signature }), account.entryPoint.address],
  });

  try {
    const { receipt, success, actualGasCost } = await bundler.waitForUserOperationReceipt({
      hash: userOpHash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
    const gas: GasPayment = sponsored ? { sponsored } : { sponsored, fee: nativeToBaseCeil(actualGasCost) };
    return { status: success ? "confirmed" : "reverted", userOpHash, transactionHash: receipt.transactionHash, gas };
  } catch (error) {
    if (error instanceof WaitForUserOperationReceiptTimeoutError) {
      return { status: "submitted_no_receipt", userOpHash, gas: sponsored ? { sponsored } : { sponsored } };
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
  const usdc = arcContracts.usdc;
  return sendUserOp(account, [encodeTransfer(to, usdc, amount)], amount);
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
  return sendUserOp(account, [{ to: arcContracts.identityRegistry, data }]);
}

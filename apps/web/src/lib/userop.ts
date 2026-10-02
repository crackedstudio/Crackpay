import { encodeTransfer } from "@circle-fin/modular-wallets-core";
import type { Address, Hash, Hex } from "viem";
import { contracts } from "../config/contracts";
import { arcChain } from "./arc";
import { createArcBundlerClient, type CrackPaySmartAccount } from "./wallet";

type Call = { to: Address; data?: Hex; value?: bigint };

/** Every userOp goes through here so gas is always sponsored. */
export async function sendSponsoredUserOp(
  account: CrackPaySmartAccount,
  calls: readonly Call[],
): Promise<{ userOpHash: Hash; transactionHash: Hash; success: boolean }> {
  const bundler = createArcBundlerClient();
  const userOpHash = await bundler.sendUserOperation({
    account,
    calls: [...calls],
    paymaster: true,
  });
  const { receipt, success } = await bundler.waitForUserOperationReceipt({
    hash: userOpHash,
  });
  return { userOpHash, transactionHash: receipt.transactionHash, success };
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

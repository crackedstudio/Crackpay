import { arcTestnet as arc, tokens } from "@crackpay/miniapp-sdk";
import type { MiniAppProvider } from "@crackpay/miniapp-sdk";
import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  http,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";
import { arcTestnet } from "viem/chains";

// Reads go straight to an Arc node. They need no wallet.
const publicClient = createPublicClient({ chain: arcTestnet, transport: http(arc.rpcUrl) });

/** The user's USDC balance, in 6-decimal base units. Native and ERC-20 USDC are one balance on Arc. */
export function readUsdcBalance(account: Address): Promise<bigint> {
  return publicClient.readContract({
    address: tokens.USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });
}

/**
 * Sends native USDC. `value` is in 18-decimal units: use parseEther("1.50").
 *
 * CrackPay shows the user a confirmation and they approve with their passkey.
 * Gas is sponsored, so no gas fields are set. The promise resolves when the
 * transaction is final, and rejects if the user cancels or the call reverts.
 */
export function sendUsdc(provider: MiniAppProvider, account: Address, to: Address, value: bigint): Promise<Hash> {
  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: custom(provider as unknown as EIP1193Provider),
  });
  return walletClient.sendTransaction({ account, chain: arcTestnet, to, value });
}

export const explorerTx = (hash: Hash) => `${arc.explorerUrl}/tx/${hash}`;

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type EIP1193Provider,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arcTestnet } from "viem/chains";
import { getCrackPayProvider, getCrackPayUser, type CrackPayOptions, type MiniAppProvider } from "./index.js";

export type CrackPayConnection = {
  provider: MiniAppProvider;
  /** The user's CrackPay account. A smart account: it cannot sign messages. */
  account: Address;
  /** Their CrackPay handle without the "@", or null if they have none. */
  handle: string | null;
  /** Sends transactions through CrackPay. Each one is confirmed by the user and gas is sponsored. */
  walletClient: WalletClient;
  /** Reads from Arc directly. */
  publicClient: PublicClient;
};

/**
 * Connects to the CrackPay wallet and returns viem clients for it, or null
 * when the page is not running inside CrackPay. Never prompts the user.
 */
export async function connectCrackPay(options: CrackPayOptions & { rpcUrl?: string } = {}): Promise<CrackPayConnection | null> {
  const provider = await getCrackPayProvider(options);
  if (!provider) return null;

  const walletClient = createWalletClient({ chain: arcTestnet, transport: custom(provider as unknown as EIP1193Provider) });
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(options.rpcUrl) });
  const { account, handle } = await getCrackPayUser(provider);

  return { provider, account, handle, walletClient, publicClient };
}

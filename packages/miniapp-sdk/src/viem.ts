import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type EIP1193Provider,
  type Chain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arc, arcTestnet } from "viem/chains";
import {
  getArcChain,
  getCrackPayProvider,
  getCrackPayUser,
  type ArcChainInfo,
  type CrackPayOptions,
  type MiniAppProvider,
} from "./index.js";

export type CrackPayConnection = {
  provider: MiniAppProvider;
  /** The user's CrackPay account. A smart account: it cannot sign messages. */
  account: Address;
  /** Their CrackPay handle without the "@", or null if they have none. */
  handle: string | null;
  /** The Arc network this CrackPay runs on: mainnet (5042) or testnet (5042002). */
  chain: ArcChainInfo;
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

  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  const chain = getArcChain(chainId);
  if (!chain) throw new Error(`CrackPay is on chain ${chainId}, which is not an Arc network this SDK knows`);

  // viem's mainnet entry ships without an RPC, so both carry Arc's own.
  const viemChain: Chain = {
    ...(chain.testnet ? arcTestnet : arc),
    rpcUrls: { default: { http: [chain.rpcUrl] } },
  };
  const walletClient = createWalletClient({ chain: viemChain, transport: custom(provider as unknown as EIP1193Provider) });
  const publicClient = createPublicClient({ chain: viemChain, transport: http(options.rpcUrl ?? chain.rpcUrl) });
  const { account, handle } = await getCrackPayUser(provider);

  return { provider, account, handle, chain, walletClient, publicClient };
}

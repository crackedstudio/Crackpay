import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
} from "viem";
import { arc, arcTestnet } from "viem/chains";
import { contracts } from "../config/contracts";
import { ARC_NETWORK } from "../config/network";

// viem's testnet entry still points at the pre-launch explorer, and its mainnet
// entry ships with no RPC at all; Arc's docs name these.
// Source: https://docs.arc.io/arc/references/connect-to-arc, retrieved 2026-10-08.
const testnet = {
  ...arcTestnet,
  blockExplorers: {
    default: {
      name: "Arc Testnet Explorer",
      url: "https://explorer.testnet.arc.io",
      apiUrl: "https://explorer.testnet.arc.io/api/v2",
    },
  },
} as const satisfies Chain;

const mainnet = {
  ...arc,
  name: "Arc",
  rpcUrls: {
    default: {
      http: ["https://rpc.mainnet.arc.io"],
      webSocket: ["wss://rpc.mainnet.arc.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://explorer.arc.io",
      apiUrl: "https://explorer.arc.io/api/v2",
    },
  },
  contracts: {
    // Checked on-chain 2026-10-08: deployed at the canonical address.
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", blockCreated: 0 },
  },
} as const satisfies Chain;

export const arcChain = ARC_NETWORK === "mainnet" ? mainnet : testnet;

/** CrackPay's and Circle's contracts on this deployment's chain. */
export const arcContracts = contracts[arcChain.id];

/** The chain's path segment on Circle's Modular Wallets client URL. */
export const circleChainPath = ARC_NETWORK === "mainnet" ? "arc" : "arcTestnet";

export class ArcConfigError extends Error {
  override name = "ArcConfigError";
}

// Referenced literally so Next can inline them into the client bundle.
const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL;
const configuredChainId = process.env.NEXT_PUBLIC_ARC_CHAIN_ID;

if (configuredChainId && Number(configuredChainId) !== arcChain.id) {
  throw new ArcConfigError(
    `NEXT_PUBLIC_ARC_CHAIN_ID is ${configuredChainId}, expected ${arcChain.id} (${arcChain.name}) for NEXT_PUBLIC_ARC_NETWORK=${ARC_NETWORK}`,
  );
}

// Falls back to the chain's default public RPC when the env var is unset.
const transport = http(rpcUrl || undefined);

export const publicClient = createPublicClient({ chain: arcChain, transport });

export function createArcWalletClient(account: Account) {
  return createWalletClient({ account, chain: arcChain, transport });
}

import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
} from "viem";
import { arcTestnet } from "viem/chains";

// viem's entry still points at the pre-launch explorer; Arc's docs name this one.
// Source: https://docs.arc.io/arc/references/connect-to-arc, retrieved 2026-10-02.
export const arcChain = {
  ...arcTestnet,
  blockExplorers: {
    default: {
      name: "Arc Testnet Explorer",
      url: "https://explorer.testnet.arc.io",
      apiUrl: "https://explorer.testnet.arc.io/api/v2",
    },
  },
} as const satisfies Chain;

export class ArcConfigError extends Error {
  override name = "ArcConfigError";
}

// Referenced literally so Next can inline them into the client bundle.
const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL;
const configuredChainId = process.env.NEXT_PUBLIC_ARC_CHAIN_ID;

if (configuredChainId && Number(configuredChainId) !== arcChain.id) {
  throw new ArcConfigError(
    `NEXT_PUBLIC_ARC_CHAIN_ID is ${configuredChainId}, expected ${arcChain.id} (${arcChain.name})`,
  );
}

// Falls back to the chain's default public RPC when the env var is unset.
const transport = http(rpcUrl || undefined);

export const publicClient = createPublicClient({ chain: arcChain, transport });

export function createArcWalletClient(account: Account) {
  return createWalletClient({ account, chain: arcChain, transport });
}

import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
} from "viem";
import { arcTestnet } from "viem/chains";

export const arcChain = arcTestnet;

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

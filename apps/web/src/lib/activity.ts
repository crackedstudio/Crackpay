import { isAddress, isAddressEqual, type Address, type Hash } from "viem";
import { contracts } from "../config/contracts";
import { identityRegistryAbi } from "../config/identity";
import { arcChain, publicClient } from "./arc";

export type ActivityItem = {
  id: string;
  direction: "in" | "out";
  counterparty: Address;
  /** Handle of the counterparty, when they have one. */
  handle: string | null;
  /** 6-decimal base units. */
  amount: bigint;
  time: Date;
  transactionHash: Hash;
};

type ExplorerTransfer = {
  from?: { hash?: string };
  to?: { hash?: string };
  total?: { value?: string };
  timestamp?: string;
  transaction_hash?: string;
  log_index?: number;
};

/**
 * Recent USDC transfers for an account, newest first.
 *
 * Interim source: the Arc explorer's API, until CrackPay's own indexer exists.
 * It lists transfers made through USDC's ERC-20 interface (6 decimals), which
 * covers every CrackPay send. A plain native send from another wallet is only
 * logged by the system emitter and will not appear here.
 */
export async function fetchActivity(account: Address, limit = 25): Promise<ActivityItem[]> {
  const usdc = contracts[arcChain.id].usdc;
  const url = `${arcChain.blockExplorers.default.apiUrl}/addresses/${account}/token-transfers?type=ERC-20&token=${usdc}`;
  const response = await fetch(url);
  // The explorer answers 404 for an address it has never seen.
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Explorer returned ${response.status}`);

  const body = (await response.json()) as { items?: ExplorerTransfer[] };
  const items: Omit<ActivityItem, "handle">[] = [];
  for (const transfer of body.items ?? []) {
    const from = transfer.from?.hash;
    const to = transfer.to?.hash;
    const value = transfer.total?.value;
    const hash = transfer.transaction_hash;
    if (!from || !to || !isAddress(from) || !isAddress(to)) continue;
    if (!value || !/^\d+$/.test(value) || !hash || !transfer.timestamp) continue;

    const outgoing = isAddressEqual(from, account);
    items.push({
      id: `${hash}:${transfer.log_index ?? 0}`,
      direction: outgoing ? "out" : "in",
      counterparty: outgoing ? to : from,
      amount: BigInt(value),
      time: new Date(transfer.timestamp),
      transactionHash: hash as Hash,
    });
    if (items.length === limit) break;
  }

  const handles = await lookUpHandles([...new Set(items.map((item) => item.counterparty))]);
  return items.map((item) => ({ ...item, handle: handles.get(item.counterparty) ?? null }));
}

async function lookUpHandles(addresses: Address[]): Promise<Map<Address, string>> {
  const found = new Map<Address, string>();
  if (addresses.length === 0) return found;
  try {
    const results = await publicClient.multicall({
      contracts: addresses.map((address) => ({
        address: contracts[arcChain.id].identityRegistry,
        abi: identityRegistryAbi,
        functionName: "reverse" as const,
        args: [address] as const,
      })),
    });
    results.forEach((result, index) => {
      const address = addresses[index];
      if (address && result.status === "success" && result.result) found.set(address, result.result);
    });
  } catch (error) {
    // Names are a nicety; the list still works with addresses.
    console.error("Handle lookup failed", error);
  }
  return found;
}

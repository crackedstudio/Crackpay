// Phase 0 spike: read USDC Transfer events on Arc Testnet from both emitters
// and compare what each one sees.
//
//   node --experimental-strip-types scripts/watch-transfers.ts [--backfill <blocks>] [--watch <seconds>]
//
// Defaults: backfill the last 20 blocks over HTTP, then watch over WebSocket
// for 20 seconds.
//
// Observed on Arc Testnet, 2026-10-02, over 300 blocks (1,264 transactions):
//   - 1,002 were seen by both emitters: an ERC-20 transfer() logs twice, once
//     from the token contract (6 decimals) and once from the system emitter
//     (18 decimals). Indexing both would double-count.
//   - 246 were seen by the system emitter only: native sends, which the token
//     contract never logs. Subscribing to the token contract alone misses them.
//   - 16 were seen by the token contract only, all zero-value transfers, which
//     the system emitter skips.
// So the indexer reads the system emitter alone and converts with nativeToBase.
import {
  createPublicClient,
  http,
  parseAbiItem,
  webSocket,
  type Address,
  type Hash,
} from "viem";
import { arcTestnet } from "viem/chains";
import { contracts, USDC_SYSTEM_EMITTER } from "../src/config/contracts.ts";
import { formatAmountExact, nativeToBase } from "../src/lib/money.ts";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const usdc = contracts[arcTestnet.id].usdc;
const emitters = [USDC_SYSTEM_EMITTER, usdc];

type Source = "system" | "erc20";

type Transfer = {
  source: Source;
  txHash: Hash;
  logIndex: number;
  from: Address;
  to: Address;
  /** 6-decimal base units, whichever emitter it came from. */
  amount: bigint;
};

function flag(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--${name} needs a non-negative integer`);
  }
  return value;
}

const seen = new Map<Hash, Set<Source>>();

function record(log: {
  address: Address;
  transactionHash: Hash | null;
  logIndex: number | null;
  args: { from?: Address; to?: Address; value?: bigint };
}): void {
  const { from, to, value } = log.args;
  if (!log.transactionHash || !from || !to || value === undefined) return;

  const isSystem = log.address.toLowerCase() === USDC_SYSTEM_EMITTER.toLowerCase();
  const transfer: Transfer = {
    source: isSystem ? "system" : "erc20",
    txHash: log.transactionHash,
    logIndex: log.logIndex ?? -1,
    from,
    to,
    // The system emitter logs 18-decimal native units; the ERC-20 contract logs 6.
    amount: isSystem ? nativeToBase(value) : value,
  };

  const sources = seen.get(transfer.txHash) ?? new Set<Source>();
  sources.add(transfer.source);
  seen.set(transfer.txHash, sources);

  console.log(
    `${transfer.source.padEnd(6)} ${transfer.txHash} #${transfer.logIndex} ` +
      `${transfer.from} → ${transfer.to} ${formatAmountExact(transfer.amount)} USDC`,
  );
}

function summarize(): void {
  let both = 0;
  let systemOnly = 0;
  let erc20Only = 0;
  for (const sources of seen.values()) {
    if (sources.has("system") && sources.has("erc20")) both++;
    else if (sources.has("system")) systemOnly++;
    else erc20Only++;
  }
  console.log(
    `\n${seen.size} transactions with USDC transfers: ` +
      `${both} seen by both emitters, ${systemOnly} by the system emitter only, ` +
      `${erc20Only} by the ERC-20 contract only`,
  );
}

async function main(): Promise<void> {
  const backfillBlocks = flag("backfill", 20);
  const watchSeconds = flag("watch", 20);

  if (backfillBlocks > 0) {
    const client = createPublicClient({
      chain: arcTestnet,
      transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || undefined),
    });
    const latest = await client.getBlockNumber();
    const fromBlock = latest - BigInt(backfillBlocks) + 1n;
    console.log(`Backfill: blocks ${fromBlock}–${latest}`);
    const logs = await client.getLogs({
      address: emitters,
      event: transferEvent,
      fromBlock,
      toBlock: latest,
    });
    logs.forEach(record);
  }

  if (watchSeconds > 0) {
    const client = createPublicClient({
      chain: arcTestnet,
      transport: webSocket(process.env.ARC_WS_URL || undefined),
    });
    console.log(`\nWatching over WebSocket for ${watchSeconds}s`);
    const unwatch = client.watchEvent({
      address: emitters,
      event: transferEvent,
      onLogs: (logs) => logs.forEach(record),
      onError: (error) => console.error("subscription error:", error),
    });
    await new Promise((resolve) => setTimeout(resolve, watchSeconds * 1000));
    unwatch();
    await (await client.transport.getRpcClient()).close();
  }

  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

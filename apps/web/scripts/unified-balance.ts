// Phase 0 spike: fund an Arc account from Base Sepolia through Unified Balance.
// Testnet only. Moves funds, so run it yourself after reading it.
//
//   node --experimental-strip-types scripts/unified-balance.ts balance <address>
//   node --experimental-strip-types scripts/unified-balance.ts deposit <amount>
//   node --experimental-strip-types scripts/unified-balance.ts spend <amount> <arc recipient>
//
// deposit and spend sign with SPIKE_EVM_PRIVATE_KEY: a throwaway EOA holding
// Base Sepolia USDC (faucet.circle.com) and a little Base Sepolia ETH for gas.
// spend uses Circle's Forwarding Service, so that EOA needs nothing on Arc.
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import { AppKit } from "@circle-fin/app-kit";
import { inspect } from "node:util";
import { parseRecipient } from "../src/lib/address.ts";
import { formatAmountExact, parseAmount } from "../src/lib/money.ts";

const SOURCE_CHAIN = "Base_Sepolia";
const DESTINATION_CHAIN = "Arc_Testnet";

const kit = new AppKit();

function adapter() {
  const privateKey = process.env.SPIKE_EVM_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("SPIKE_EVM_PRIVATE_KEY must be set to a 0x-prefixed 32-byte hex key");
  }
  return createViemAdapterFromPrivateKey({ privateKey: privateKey as `0x${string}` });
}

/** Validates through money.ts, then hands the SDK the plain decimal string it expects. */
function amountArg(value: string | undefined): string {
  const base = parseAmount(value ?? "");
  if (base === 0n) throw new Error("Amount must be greater than zero");
  return formatAmountExact(base).replace(/,/g, "");
}

function show(label: string, value: unknown): void {
  console.log(label, inspect(value, false, null, true));
}

async function main(): Promise<void> {
  const [command, first, second] = process.argv.slice(2);

  switch (command) {
    case "balance": {
      const address = parseRecipient(first ?? "");
      const balances = await kit.unifiedBalance.getBalances({
        sources: { address },
        networkType: "testnet",
      });
      show("BALANCES", balances);
      return;
    }
    case "deposit": {
      const amount = amountArg(first);
      console.log(`Depositing ${amount} USDC on ${SOURCE_CHAIN} into Unified Balance`);
      const result = await kit.unifiedBalance.deposit({
        from: { adapter: adapter(), chain: SOURCE_CHAIN },
        amount,
      });
      show("DEPOSIT", result);
      return;
    }
    case "spend": {
      const amount = amountArg(first);
      const recipientAddress = parseRecipient(second ?? "");
      console.log(
        `Spending ${amount} USDC from ${SOURCE_CHAIN} to ${recipientAddress} on ${DESTINATION_CHAIN}`,
      );
      const result = await kit.unifiedBalance.spend({
        from: { adapter: adapter(), allocations: { amount, chain: SOURCE_CHAIN } },
        to: { chain: DESTINATION_CHAIN, recipientAddress, useForwarder: true },
        amount,
      });
      show("SPEND", result);
      return;
    }
    default:
      throw new Error("Usage: unified-balance.ts balance <address> | deposit <amount> | spend <amount> <recipient>");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

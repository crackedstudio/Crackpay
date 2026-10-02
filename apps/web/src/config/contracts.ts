import type { Address } from "viem";
import { arcTestnet } from "viem/chains";

// Source: https://docs.arc.io/arc/references/contract-addresses
// Retrieved: 2026-10-02
//
// USDC is Arc's native asset; this address is its optional ERC-20 interface
// (6 decimals) over the same balance. There is no wrapped USDC.
export const contracts = {
  [arcTestnet.id]: {
    usdc: "0x3600000000000000000000000000000000000000",
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  },
} as const satisfies Record<number, { usdc: Address; eurc: Address }>;

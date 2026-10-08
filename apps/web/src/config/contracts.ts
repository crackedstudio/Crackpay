import type { Address } from "viem";
import { arc, arcTestnet } from "viem/chains";

// Source: https://docs.arc.io/arc/references/contract-addresses
// Retrieved: 2026-10-02 (testnet), 2026-10-08 (mainnet)
//
// USDC is Arc's native asset; this address is its optional ERC-20 interface
// (6 decimals) over the same balance. There is no wrapped USDC.
export const contracts = {
  [arcTestnet.id]: {
    usdc: "0x3600000000000000000000000000000000000000",
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    // CrackPay's own deployment, 2026-10-02, block 65110233, source verified.
    // tx 0x20dfe04e38c4775bd8a627bdd0e6abb4a5d2739d898d4140b0a5c52bf41f0d5e
    identityRegistry: "0x1c36829d1d82470bfb9FAd9bE264729c26753Ef7",
  },
  [arc.id]: {
    usdc: "0x3600000000000000000000000000000000000000",
    eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
    // CrackPay's own deployment, 2026-10-08, block 24877959, source verified on Sourcify.
    // tx 0xbca22f8008475168b08c205393fb490bb9bbd0f30a27239d77f9ba6909cd63e4
    identityRegistry: "0xB417597Eb5dd49b69f3a573ad73Fc8B528a16dcF",
  },
} as const satisfies Record<number, { usdc: Address; eurc: Address; identityRegistry: Address }>;

// Source: https://docs.arc.io/arc/references/usdc-system-events
// Retrieved: 2026-10-02
//
// EIP-7708 system emitter. Logs a Transfer (18 decimals) for every USDC
// movement, native or ERC-20. Same address on every Arc network.
export const USDC_SYSTEM_EMITTER: Address =
  "0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE";

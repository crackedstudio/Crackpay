import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The fixtures describe Arc Testnet. Pin it so a shell or .env set to
    // mainnet cannot change what the tests mean; mainnet cases pass the
    // network explicitly.
    env: { NEXT_PUBLIC_ARC_NETWORK: "testnet", NEXT_PUBLIC_ARC_CHAIN_ID: "5042002" },
  },
});

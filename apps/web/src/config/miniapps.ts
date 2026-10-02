import { arcTestnet } from "viem/chains";
import type { Address } from "viem";
import type { Policy } from "../lib/miniapp/policy";
import { contracts } from "./contracts";

export type MiniApp = {
  id: string;
  name: string;
  description: string;
  /** Where the app is hosted. Must be a different origin from CrackPay. */
  url: string;
  /** Kill switch: a disabled app is neither listed nor loadable. */
  enabled: boolean;
  policy: Policy;
};

const tokens = contracts[arcTestnet.id];

// Source: KashLink contracts/deployments.md, Arc Testnet v4 escrow.
// Retrieved: 2026-10-02
const KASHLINK_ESCROW: Address = "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62";

export const miniApps: readonly MiniApp[] = [
  {
    id: "kashlink",
    name: "KashLink",
    description: "Send USDC or EURC as a link.",
    // Referenced literally so Next can inline it into the client bundle.
    url: process.env.NEXT_PUBLIC_MINIAPP_KASHLINK_URL || "http://localhost:5191",
    enabled: true,
    policy: {
      contracts: [KASHLINK_ESCROW],
      tokens: [{ symbol: "EURC", address: tokens.eurc }],
    },
  },
];

export function findMiniApp(id: string): MiniApp | undefined {
  return miniApps.find((app) => app.id === id && app.enabled);
}

/** Origins CrackPay is allowed to frame. Feeds the CSP `frame-src` allowlist. */
export function miniAppOrigins(): string[] {
  return miniApps.filter((app) => app.enabled).map((app) => new URL(app.url).origin);
}

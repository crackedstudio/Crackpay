import type { Policy } from "../lib/miniapp/policy";
import { arcContracts } from "../lib/arc";
import { IS_MAINNET } from "./network";
import type { MiniAppRecord } from "../lib/miniapp/registry";

export type MiniApp = {
  id: string;
  name: string;
  description: string;
  /** Where the app is hosted. Must be a different origin from CrackPay. */
  url: string;
  icon?: string;
  category?: string;
  publisher?: string;
  /** Kill switch: a disabled app is neither listed nor loadable. */
  enabled: boolean;
  policy: Policy;
  /** Set for an unreviewed URL loaded through Developer mode. Never set for a listed app. */
  test?: boolean;
};

/**
 * The registry lives in the database and is managed from /admin. This list is
 * only what a local dev server shows when no database is configured. KashLink's
 * escrow below is its testnet deployment, so a mainnet build starts empty.
 */
export const DEFAULT_MINI_APPS: readonly MiniAppRecord[] = IS_MAINNET ? [] : [
  {
    id: "kashlink",
    name: "KashLink",
    tagline: "Send USDC or EURC as a link.",
    publisher: "Cracked Studios",
    category: "finance",
    url: process.env.NEXT_PUBLIC_MINIAPP_KASHLINK_URL || "http://localhost:5191",
    icon: null,
    network: "arc-testnet",
    // Source: KashLink contracts/deployments.md, Arc Testnet v4 escrow. Retrieved 2026-10-02.
    contracts: [{ address: "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62", name: "KashLinkEscrow" }],
    tokenApprovals: ["EURC"],
    enabled: true,
    sortOrder: 0,
  },
];

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Wraps an arbitrary URL as a Mini App for Developer mode. It is not reviewed
 * and nothing is allowlisted, so its policy is unrestricted and the host marks
 * every prompt as coming from a test app. Returns null for a URL that cannot
 * be loaded: it must be HTTPS, or plain HTTP on localhost.
 */
/** Why a URL cannot be loaded as a test app, or null when it can. */
export function testUrlProblem(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return "Enter the full address of your app, starting with https://";
  }
  if (url.protocol === "https:") return null;
  if (url.protocol !== "http:") return "The address must start with https://";
  if (isLocalhost(url.hostname)) return null;
  // Browsers refuse to load an http:// page inside the secure CrackPay page.
  return "That address is not secure (http://). Use an https:// address: a deployed URL, a tunnel such as ngrok, or HTTPS on your dev server.";
}

export function testMiniApp(input: string): MiniApp | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const allowed = url.protocol === "https:" || (url.protocol === "http:" && isLocalhost(url.hostname));
  if (!allowed) return null;

  return {
    id: "test",
    name: url.host,
    description: "Test app",
    url: url.href,
    enabled: true,
    test: true,
    policy: {
      contracts: [],
      tokens: [
        { symbol: "USDC", address: arcContracts.usdc },
        { symbol: "EURC", address: arcContracts.eurc },
      ],
      unrestricted: true,
    },
  };
}

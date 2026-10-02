import { isAddress, isAddressEqual, type Address } from "viem";
import { arcTestnet } from "viem/chains";
import { contracts } from "../../config/contracts";
import type { MiniApp } from "../../config/miniapps";
import { LISTING_CATEGORIES, LISTING_NETWORKS, LISTING_TOKENS } from "./listing";

// A listed Mini App as an admin enters it and as the database stores it.

export type MiniAppRecord = {
  /** URL slug: /apps/<id>. */
  id: string;
  name: string;
  tagline: string;
  publisher: string;
  category: (typeof LISTING_CATEGORIES)[number];
  url: string;
  /** Optional HTTPS icon. */
  icon: string | null;
  network: (typeof LISTING_NETWORKS)[number];
  /** Every contract the app may call. */
  contracts: { address: Address; name: string }[];
  /** Tokens the app may ask for an allowance on, for one of `contracts`. */
  tokenApprovals: (typeof LISTING_TOKENS)[number][];
  /** Kill switch. A disabled app is neither listed nor loadable. */
  enabled: boolean;
  sortOrder: number;
};

/** The network this deployment of CrackPay runs on. */
export const CURRENT_NETWORK: MiniAppRecord["network"] = "arc-testnet";

/** A problem with one field, phrased for the admin filling in the form. */
export class RegistryInputError extends Error {
  override name = "RegistryInputError";
}

type Json = Record<string, unknown>;

function text(source: Json, field: string, max: number, min = 1): string {
  const value = source[field];
  if (typeof value !== "string" || value.trim().length < min) throw new RegistryInputError(`${field} is required`);
  if (value.trim().length > max) throw new RegistryInputError(`${field} must be at most ${max} characters`);
  return value.trim();
}

function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new RegistryInputError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function httpsUrl(value: unknown, field: string): string {
  let url: URL | null = null;
  try {
    url = typeof value === "string" ? new URL(value.trim()) : null;
  } catch {
    url = null;
  }
  if (!url || url.protocol !== "https:") throw new RegistryInputError(`${field} must be an https:// URL`);
  return url.href;
}

/** Checks what an admin submitted and returns the record to store. */
export function parseMiniAppInput(input: unknown): MiniAppRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new RegistryInputError("Expected a Mini App object");
  }
  const source = input as Json;

  const id = typeof source.id === "string" ? source.id.trim() : "";
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(id)) {
    throw new RegistryInputError("id must be 2–31 lowercase letters, digits or hyphens, starting with a letter or digit");
  }
  // /apps/test is the Developer mode route.
  if (id === "test") throw new RegistryInputError('id "test" is reserved');

  if (!Array.isArray(source.contracts)) throw new RegistryInputError("contracts must be a list");
  if (source.contracts.length > 20) throw new RegistryInputError("contracts can have at most 20 entries");
  const contractList: MiniAppRecord["contracts"] = [];
  source.contracts.forEach((entry: unknown, index: number) => {
    const at = `contracts[${index}]`;
    if (typeof entry !== "object" || entry === null) throw new RegistryInputError(`${at} must be an object`);
    const { address } = entry as Json;
    if (typeof address !== "string" || !isAddress(address)) {
      throw new RegistryInputError(`${at}.address must be a contract address`);
    }
    if (contractList.some((existing) => isAddressEqual(existing.address, address))) {
      throw new RegistryInputError(`contracts lists ${address} twice`);
    }
    contractList.push({ address, name: text(entry as Json, "name", 60) });
  });

  const tokenInput = source.tokenApprovals ?? [];
  if (!Array.isArray(tokenInput)) throw new RegistryInputError("tokenApprovals must be a list");
  const tokenApprovals = [...new Set(tokenInput.map((token) => oneOf(token, "tokenApprovals", LISTING_TOKENS)))];
  if (tokenApprovals.length > 0 && contractList.length === 0) {
    throw new RegistryInputError("tokenApprovals needs at least one contract to approve");
  }

  const sortOrder = source.sortOrder ?? 0;
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < -1000 || sortOrder > 1000) {
    throw new RegistryInputError("sortOrder must be a whole number between -1000 and 1000");
  }
  if (source.enabled !== undefined && typeof source.enabled !== "boolean") {
    throw new RegistryInputError("enabled must be true or false");
  }

  const icon = typeof source.icon === "string" && source.icon.trim() ? httpsUrl(source.icon, "icon") : null;

  return {
    id,
    name: text(source, "name", 40, 2),
    tagline: text(source, "tagline", 160),
    publisher: text(source, "publisher", 80),
    category: oneOf(source.category, "category", LISTING_CATEGORIES),
    url: httpsUrl(source.url, "url"),
    icon,
    network: oneOf(source.network, "network", LISTING_NETWORKS),
    contracts: contractList,
    tokenApprovals,
    enabled: source.enabled === true,
    sortOrder,
  };
}

const tokenAddresses = {
  USDC: contracts[arcTestnet.id].usdc,
  EURC: contracts[arcTestnet.id].eurc,
} as const;

/** The form the wallet uses: a record plus the policy the bridge enforces. */
export function toMiniApp(record: MiniAppRecord): MiniApp {
  return {
    id: record.id,
    name: record.name,
    description: record.tagline,
    url: record.url,
    icon: record.icon ?? undefined,
    category: record.category,
    publisher: record.publisher,
    enabled: record.enabled,
    policy: {
      contracts: record.contracts.map((contract) => contract.address),
      tokens: record.tokenApprovals.map((symbol) => ({ symbol, address: tokenAddresses[symbol] })),
    },
  };
}

/** Apps a user may open on this deployment, in display order. */
export function visibleMiniApps(records: readonly MiniAppRecord[]): MiniApp[] {
  return records
    .filter((record) => record.enabled && record.network === CURRENT_NETWORK)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map(toMiniApp);
}

/**
 * What a page may put in a frame, as a CSP `frame-src` value.
 *  - /apps/test (Developer mode) may frame any HTTPS site, or localhost.
 *  - /apps/<id> may frame exactly that app's origin, if it is visible.
 *  - Everything else may frame nothing but CrackPay itself.
 */
export function frameSources(pathname: string, records: readonly MiniAppRecord[]): string {
  if (pathname === "/apps/test") return "https: http://localhost:* http://127.0.0.1:*";
  const match = /^\/apps\/([^/]+)\/?$/.exec(pathname);
  const app = match && visibleMiniApps(records).find((entry) => entry.id === match[1]);
  return app ? new URL(app.url).origin : "'self'";
}

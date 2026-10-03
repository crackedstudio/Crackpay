import { isAddress, type Address } from "viem";

// The listing file a developer submits. Its shape is documented in
// public/developers/listing.md; keep the two in step.

export const LISTING_CATEGORIES = [
  "finance",
  "shopping",
  "utility",
  "games",
  "social",
  "rewards",
  "education",
  "entertainment",
] as const;
/** What each category is called on screen: plain words, not finance jargon. */
export const CATEGORY_LABELS: Record<(typeof LISTING_CATEGORIES)[number], string> = {
  finance: "Money",
  shopping: "Shopping",
  utility: "Tools",
  games: "Games",
  social: "Social",
  rewards: "Rewards",
  education: "Learn",
  entertainment: "Fun",
};

export const LISTING_NETWORKS = ["arc-testnet", "arc-mainnet"] as const;
export const LISTING_TOKENS = ["USDC", "EURC"] as const;

export type Listing = {
  name: string;
  tagline: string;
  publisher: string;
  category: (typeof LISTING_CATEGORIES)[number];
  url: string;
  icon: string;
  supportUrl: string;
  termsUrl: string;
  privacyUrl: string;
  network: (typeof LISTING_NETWORKS)[number];
  contracts: { address: Address; name: string; purpose: string; explorerUrl: string; sampleTransactions: string[] }[];
  tokenApprovals: (typeof LISTING_TOKENS)[number][];
  origins: string[];
};

/** A problem with one field of a listing, phrased for the developer who wrote it. */
export class ListingError extends Error {
  override name = "ListingError";
}

type Json = Record<string, unknown>;

function text(source: Json, field: string, max: number, min = 1): string {
  const value = source[field];
  if (typeof value !== "string" || value.trim().length < min) throw new ListingError(`${field} is required`);
  if (value.trim().length > max) throw new ListingError(`${field} must be at most ${max} characters`);
  return value.trim();
}

function link(value: unknown, field: string, protocols: readonly string[] = ["https:"]): string {
  let url: URL | null = null;
  try {
    url = typeof value === "string" ? new URL(value.trim()) : null;
  } catch {
    url = null;
  }
  if (!url || !protocols.includes(url.protocol)) {
    throw new ListingError(`${field} must be ${protocols.includes("mailto:") ? "an https:// or mailto: link" : "an https:// URL"}`);
  }
  return url.href;
}

function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ListingError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function list(value: unknown, field: string, max: number): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ListingError(`${field} must be a list`);
  if (value.length > max) throw new ListingError(`${field} can have at most ${max} entries`);
  return value;
}

/** Checks a submitted listing and returns it normalised. Throws ListingError naming the first bad field. */
export function parseListing(input: unknown): Listing {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ListingError("The listing must be a JSON object");
  }
  const source = input as Json;

  const contracts = list(source.contracts, "contracts", 20).map((entry, index) => {
    const at = `contracts[${index}]`;
    if (typeof entry !== "object" || entry === null) throw new ListingError(`${at} must be an object`);
    const contract = entry as Json;
    if (typeof contract.address !== "string" || !isAddress(contract.address)) {
      throw new ListingError(`${at}.address must be a contract address`);
    }
    return {
      address: contract.address,
      name: text(contract, "name", 60),
      purpose: text(contract, "purpose", 300),
      explorerUrl: link(contract.explorerUrl, `${at}.explorerUrl`),
      sampleTransactions: list(contract.sampleTransactions, `${at}.sampleTransactions`, 20).map((tx, txIndex) =>
        link(tx, `${at}.sampleTransactions[${txIndex}]`),
      ),
    };
  });

  const seen = new Set<string>();
  for (const contract of contracts) {
    const key = contract.address.toLowerCase();
    if (seen.has(key)) throw new ListingError(`contracts lists ${contract.address} twice`);
    seen.add(key);
  }

  const tokenApprovals = list(source.tokenApprovals, "tokenApprovals", LISTING_TOKENS.length).map((token) =>
    oneOf(token, "tokenApprovals", LISTING_TOKENS),
  );
  if (tokenApprovals.length > 0 && contracts.length === 0) {
    throw new ListingError("tokenApprovals needs at least one contract to approve");
  }

  return {
    name: text(source, "name", 40, 2),
    tagline: text(source, "tagline", 160),
    publisher: text(source, "publisher", 80),
    category: oneOf(source.category, "category", LISTING_CATEGORIES),
    url: link(source.url, "url"),
    icon: link(source.icon, "icon"),
    supportUrl: link(source.supportUrl, "supportUrl", ["https:", "mailto:"]),
    termsUrl: link(source.termsUrl, "termsUrl"),
    privacyUrl: link(source.privacyUrl, "privacyUrl"),
    network: oneOf(source.network, "network", LISTING_NETWORKS),
    contracts,
    tokenApprovals: [...new Set(tokenApprovals)],
    origins: list(source.origins, "origins", 30).map((origin, index) => new URL(link(origin, `origins[${index}]`)).origin),
  };
}

export const LISTING_TEMPLATE = `{
  "name": "",
  "tagline": "",
  "publisher": "",
  "category": "finance",
  "url": "https://",
  "icon": "https://",
  "supportUrl": "https://",
  "termsUrl": "https://",
  "privacyUrl": "https://",
  "network": "arc-testnet",
  "contracts": [
    {
      "address": "0x",
      "name": "",
      "purpose": "",
      "explorerUrl": "https://explorer.testnet.arc.io/address/0x",
      "sampleTransactions": []
    }
  ],
  "tokenApprovals": [],
  "origins": []
}`;

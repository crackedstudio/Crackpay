// KashLink is CrackPay's way to send money as a link. It is a listed Mini App,
// not part of the wallet: CrackPay opens it, and it uses the CrackPay account.
// These helpers let wallet screens hand the user over to it.

import { ARC_NETWORK, type ArcNetwork } from "../config/network";

/** KashLink's id in the Mini App registry. */
export const KASHLINK_APP_ID = "kashlink";

// KashLink keeps a separate deployment per network, and a link only claims on
// the network it was made on. Each CrackPay deployment opens its own network's
// links and names the other one's.
const HOSTS: Record<ArcNetwork, readonly string[]> = {
  testnet: ["testnet.kashlink.live"],
  mainnet: ["arc.kashlink.live", "kashlink.live", "www.kashlink.live"],
};

export type KashLinkProblem = "not_a_link" | "other_network";

export type KashLinkParse = { ok: true; fragment: string } | { ok: false; reason: KashLinkProblem };

/** The part of a link that carries its key: a 64-character hex key, then optional "&m=note". */
const KEY_FRAGMENT = /^(0x)?[0-9a-f]{64}(&.*)?$/i;

/**
 * Reads a KashLink someone pasted: the full link, or just the part after "#".
 * Returns the fragment to hand to the KashLink Mini App. The fragment holds the
 * link's key, so it is only ever passed on in a URL fragment, never sent anywhere.
 */
export function parseKashLink(input: string, network: ArcNetwork = ARC_NETWORK): KashLinkParse {
  const value = input.trim();
  if (!value) return { ok: false, reason: "not_a_link" };

  const bare = value.replace(/^#/, "");
  if (KEY_FRAGMENT.test(bare)) return { ok: true, fragment: bare };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "not_a_link" };
  }
  const host = url.hostname.toLowerCase();
  const fragment = url.hash.replace(/^#/, "");
  const other: ArcNetwork = network === "mainnet" ? "testnet" : "mainnet";
  if (HOSTS[other].includes(host)) return { ok: false, reason: "other_network" };
  if (url.protocol !== "https:" || !HOSTS[network].includes(host) || !KEY_FRAGMENT.test(fragment)) {
    return { ok: false, reason: "not_a_link" };
  }
  return { ok: true, fragment };
}

/** Where to send the user to open a KashLink inside CrackPay. */
export function kashLinkAppUrl(fragment?: string): string {
  return `/apps/${KASHLINK_APP_ID}${fragment ? `#${fragment}` : ""}`;
}

/** The link a user is told to paste, for the placeholder and the error. */
export const kashLinkExample = (network: ArcNetwork = ARC_NETWORK) => `https://${HOSTS[network][0]}`;

export function kashLinkProblem(reason: KashLinkProblem, network: ArcNetwork = ARC_NETWORK): string {
  if (reason === "not_a_link") {
    return `That isn't a KashLink. Paste the whole link you were sent, starting with ${kashLinkExample(network)}.`;
  }
  return network === "mainnet"
    ? "That link is a test link from Arc Testnet and holds no real money. Open it at testnet.kashlink.live instead."
    : "That link is for Arc mainnet, and this is the CrackPay test app. Open it in CrackPay instead.";
}

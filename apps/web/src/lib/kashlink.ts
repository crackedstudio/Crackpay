// KashLink is CrackPay's way to send money as a link. It is a listed Mini App,
// not part of the wallet: CrackPay opens it, and it uses the CrackPay account.
// These helpers let wallet screens hand the user over to it.

/** KashLink's id in the Mini App registry. */
export const KASHLINK_APP_ID = "kashlink";

// KashLink keeps a separate deployment per network. CrackPay runs on Arc
// Testnet, so only testnet links can be opened here.
const TESTNET_HOSTS = ["testnet.kashlink.live"];
const MAINNET_HOSTS = ["arc.kashlink.live", "kashlink.live", "www.kashlink.live"];

export type KashLinkParse =
  | { ok: true; fragment: string }
  | { ok: false; reason: "not_a_link" | "mainnet" };

/** The part of a link that carries its key: a 64-character hex key, then optional "&m=note". */
const KEY_FRAGMENT = /^(0x)?[0-9a-f]{64}(&.*)?$/i;

/**
 * Reads a KashLink someone pasted: the full link, or just the part after "#".
 * Returns the fragment to hand to the KashLink Mini App. The fragment holds the
 * link's key, so it is only ever passed on in a URL fragment, never sent anywhere.
 */
export function parseKashLink(input: string): KashLinkParse {
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
  if (MAINNET_HOSTS.includes(host)) return { ok: false, reason: "mainnet" };
  if (url.protocol !== "https:" || !TESTNET_HOSTS.includes(host) || !KEY_FRAGMENT.test(fragment)) {
    return { ok: false, reason: "not_a_link" };
  }
  return { ok: true, fragment };
}

/** Where to send the user to open a KashLink inside CrackPay. */
export function kashLinkAppUrl(fragment?: string): string {
  return `/apps/${KASHLINK_APP_ID}${fragment ? `#${fragment}` : ""}`;
}

export const kashLinkProblem = (reason: "not_a_link" | "mainnet") =>
  reason === "mainnet"
    ? "That link is for Arc mainnet, and CrackPay runs on Arc Testnet for now. Open it at arc.kashlink.live instead."
    : "That isn't a KashLink. Paste the whole link you were sent, starting with https://testnet.kashlink.live.";

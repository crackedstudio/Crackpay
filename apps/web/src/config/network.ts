/**
 * Which Arc network this deployment of CrackPay runs on. Chosen at build time,
 * one network per deployment: mainnet and testnet are separate sites with
 * separate Circle keys, Supabase projects and passkey domains, because a
 * phone number or handle registered on one must never resolve on the other.
 *
 * Unset means testnet, so a deployment only touches real money when someone
 * has asked for it by name.
 */
export type ArcNetwork = "mainnet" | "testnet";

export class NetworkConfigError extends Error {
  override name = "NetworkConfigError";
}

// Referenced literally so Next can inline it into the client bundle.
const configured = process.env.NEXT_PUBLIC_ARC_NETWORK;

if (configured && configured !== "mainnet" && configured !== "testnet") {
  throw new NetworkConfigError(`NEXT_PUBLIC_ARC_NETWORK is "${configured}", expected "mainnet" or "testnet"`);
}

export const ARC_NETWORK: ArcNetwork = configured === "mainnet" ? "mainnet" : "testnet";

export const IS_MAINNET = ARC_NETWORK === "mainnet";

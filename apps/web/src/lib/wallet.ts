import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
} from "@circle-fin/modular-wallets-core";
import { createPublicClient } from "viem";
import {
  createBundlerClient,
  toWebAuthnAccount,
  type P256Credential,
} from "viem/account-abstraction";
import { arcChain } from "./arc";

export class WalletConfigError extends Error {
  override name = "WalletConfigError";
}

// Referenced literally so Next can inline them into the client bundle.
const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY;
const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL;

function circleConfig(): { clientKey: string; clientUrl: string } {
  if (!clientKey || !clientUrl) {
    throw new WalletConfigError(
      "NEXT_PUBLIC_CIRCLE_CLIENT_KEY and NEXT_PUBLIC_CIRCLE_CLIENT_URL must be set",
    );
  }
  return { clientKey, clientUrl };
}

function modularTransport() {
  const { clientKey, clientUrl } = circleConfig();
  return toModularTransport(`${clientUrl}/arcTestnet`, clientKey);
}

/** Creates a new passkey. Prompts the platform authenticator. */
export async function registerPasskey(username: string): Promise<P256Credential> {
  const { clientKey, clientUrl } = circleConfig();
  return toWebAuthnCredential({
    transport: toPasskeyTransport(clientUrl, clientKey),
    mode: WebAuthnMode.Register,
    username,
  });
}

/** Signs in with an existing passkey for this domain. */
export async function loginWithPasskey(): Promise<P256Credential> {
  const { clientKey, clientUrl } = circleConfig();
  return toWebAuthnCredential({
    transport: toPasskeyTransport(clientUrl, clientKey),
    mode: WebAuthnMode.Login,
  });
}

/**
 * The Circle smart account owned by this passkey. The address is
 * counterfactual until the first userOp deploys it.
 */
export async function toSmartAccount(credential: P256Credential) {
  const client = createPublicClient({
    chain: arcChain,
    transport: modularTransport(),
  });
  return toCircleSmartAccount({
    client,
    owner: toWebAuthnAccount({ credential }),
  });
}

export type CrackPaySmartAccount = Awaited<ReturnType<typeof toSmartAccount>>;

export function createArcBundlerClient() {
  return createBundlerClient({ chain: arcChain, transport: modularTransport() });
}

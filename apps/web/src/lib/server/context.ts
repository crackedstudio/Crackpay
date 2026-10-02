import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { contracts } from "../../config/contracts";
import { ONBOARDING_MODE } from "../../config/onboarding";
import { identityRegistryAbi } from "../../config/identity";
import { arcChain, publicClient } from "../arc";
import { ServerConfigError, requireEnv } from "./errors";
import type { IdentityDeps } from "./identity-service";
import { consoleSms, type CodeVerifier } from "./sms";
import { MemoryStore, type Store } from "./store";
import { SupabaseStore } from "./supabase-store";
import { twilioVerify } from "./twilio-verify";

const isProduction = process.env.NODE_ENV === "production";

// Survives dev-server hot reloads, so the in-memory store is not wiped on every edit.
const globals = globalThis as { crackpayDeps?: IdentityDeps };

function createStore(): Store {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseStore(url, key);
  if (isProduction) throw new ServerConfigError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set");
  console.warn("[crackpay] Supabase is not configured: using an in-memory store that is lost on restart.");
  return new MemoryStore();
}

/** Twilio Verify when its three variables are set; otherwise nothing. */
function createVerifier(): CodeVerifier | undefined {
  // Passkey-only onboarding never sends a code, so it needs no SMS provider.
  if (ONBOARDING_MODE === "passkey") return undefined;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (accountSid && authToken && serviceSid) return twilioVerify({ accountSid, authToken, serviceSid });
  if (isProduction) {
    throw new ServerConfigError("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID are not set");
  }
  console.warn("[crackpay] Twilio Verify is not configured: codes are printed to this log instead of being sent.");
  return undefined;
}

export const sessionSecret = () => requireEnv("SESSION_SECRET");

export function identityDeps(): IdentityDeps {
  if (globals.crackpayDeps) return globals.crackpayDeps;

  const signerKey = requireEnv("ATTESTATION_SIGNER_KEY");
  const registryAddress = contracts[arcChain.id].identityRegistry;
  const read = { address: registryAddress, abi: identityRegistryAbi } as const;

  globals.crackpayDeps = {
    store: createStore(),
    sms: consoleSms,
    verifier: createVerifier(),
    exposeDevCode: !isProduction,
    registry: {
      resolveHandle: (handle) => publicClient.readContract({ ...read, functionName: "resolveHandle", args: [handle] }),
      resolvePhone: (hash) => publicClient.readContract({ ...read, functionName: "resolvePhone", args: [hash] }),
    },
    attester: privateKeyToAccount((signerKey.startsWith("0x") ? signerKey : `0x${signerKey}`) as Hex),
    chainId: arcChain.id,
    registryAddress,
    pepper: requireEnv("PHONE_HASH_PEPPER"),
    secret: sessionSecret(),
    now: Date.now,
  };
  return globals.crackpayDeps;
}

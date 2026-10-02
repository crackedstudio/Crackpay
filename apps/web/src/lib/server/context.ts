import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { contracts } from "../../config/contracts";
import { identityRegistryAbi } from "../../config/identity";
import { arcChain, publicClient } from "../arc";
import { ServerConfigError, requireEnv } from "./errors";
import type { IdentityDeps } from "./identity-service";
import { consoleSms } from "./sms";
import { MemoryStore, type Store } from "./store";
import { SupabaseStore } from "./supabase-store";

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

function createSms() {
  // No SMS provider is integrated yet. Codes go to the server log in development only.
  if (isProduction) throw new ServerConfigError("No SMS provider is configured");
  return consoleSms;
}

export const sessionSecret = () => requireEnv("SESSION_SECRET");

export function identityDeps(): IdentityDeps {
  if (globals.crackpayDeps) return globals.crackpayDeps;

  const signerKey = requireEnv("ATTESTATION_SIGNER_KEY");
  const registryAddress = contracts[arcChain.id].identityRegistry;
  const read = { address: registryAddress, abi: identityRegistryAbi } as const;

  globals.crackpayDeps = {
    store: createStore(),
    sms: createSms(),
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

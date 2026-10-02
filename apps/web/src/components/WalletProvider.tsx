"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { P256Credential } from "viem/account-abstraction";
import { contracts } from "@/config/contracts";
import { identityRegistryAbi } from "@/config/identity";
import { api } from "@/lib/api";
import { arcChain, publicClient } from "@/lib/arc";
import { clearCredential, loadCredential, saveCredential } from "@/lib/session";
import { toSmartAccount, type CrackPaySmartAccount } from "@/lib/wallet";

type State =
  | { status: "loading" }
  | { status: "signed-out"; error?: string }
  /** `handle` is null until the account is registered in IdentityRegistry. */
  | { status: "ready"; account: CrackPaySmartAccount; handle: string | null };

type Wallet = State & {
  /** Adopts a passkey credential as this browser's account. */
  signIn(credential: P256Credential): Promise<CrackPaySmartAccount>;
  signOut(): Promise<void>;
  /** Re-reads the handle from the chain, after registering. */
  refreshHandle(): Promise<void>;
};

const WalletContext = createContext<Wallet | null>(null);

// The chain is the source of truth for who an account is.
async function readHandle(account: CrackPaySmartAccount): Promise<string | null> {
  const handle = await publicClient.readContract({
    address: contracts[arcChain.id].identityRegistry,
    abi: identityRegistryAbi,
    functionName: "reverse",
    args: [account.address],
  });
  return handle || null;
}

async function open(credential: P256Credential): Promise<State> {
  const account = await toSmartAccount(credential);
  return { status: "ready", account, handle: await readHandle(account) };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const credential = loadCredential();
    if (!credential) {
      // localStorage is browser-only, so this has to wait for hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "signed-out" });
      return;
    }
    open(credential).then(setState, (error: unknown) => {
      console.error(error);
      setState({ status: "signed-out", error: error instanceof Error ? error.message : String(error) });
    });
  }, []);

  const signIn = useCallback(async (credential: P256Credential) => {
    const next = await open(credential);
    saveCredential(credential);
    setState(next);
    if (next.status !== "ready") throw new Error("Could not open the account");
    return next.account;
  }, []);

  const signOut = useCallback(async () => {
    await api.delete("/api/session").catch((error: unknown) => console.error(error));
    clearCredential();
    setState({ status: "signed-out" });
  }, []);

  const refreshHandle = useCallback(async () => {
    if (state.status !== "ready") return;
    const handle = await readHandle(state.account);
    setState({ ...state, handle });
  }, [state]);

  const value = useMemo(() => ({ ...state, signIn, signOut, refreshHandle }), [state, signIn, signOut, refreshHandle]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): Wallet {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside WalletProvider");
  return wallet;
}

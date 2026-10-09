"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { P256Credential } from "viem/account-abstraction";
import { identityRegistryAbi } from "@/config/identity";
import { api } from "@/lib/api";
import { arcContracts, publicClient } from "@/lib/arc";
import { loadPendingHandle, savePendingHandle } from "@/lib/pending-handle";
import { clearCredential, loadCredential, saveCredential } from "@/lib/session";
import { toSmartAccount, type CrackPaySmartAccount } from "@/lib/wallet";

type State =
  | { status: "loading" }
  | { status: "signed-out"; error?: string }
  /**
   * `handle` is null until the account is registered in IdentityRegistry.
   * `pendingHandle` is one chosen at sign-up and waiting for the account to be
   * able to pay the fee to register it (see lib/pending-handle.ts).
   */
  | { status: "ready"; account: CrackPaySmartAccount; handle: string | null; pendingHandle: string | null };

type Wallet = State & {
  /** Adopts a passkey credential as this browser's account. */
  signIn(credential: P256Credential): Promise<CrackPaySmartAccount>;
  signOut(): Promise<void>;
  /** Re-reads the handle from the chain, after registering. */
  refreshHandle(): Promise<void>;
  /** Remembers, or forgets, a handle chosen but not yet registered. */
  setPendingHandle(handle: string | null): void;
};

const WalletContext = createContext<Wallet | null>(null);

// The chain is the source of truth for who an account is.
async function readHandle(account: CrackPaySmartAccount): Promise<string | null> {
  const handle = await publicClient.readContract({
    address: arcContracts.identityRegistry,
    abi: identityRegistryAbi,
    functionName: "reverse",
    args: [account.address],
  });
  return handle || null;
}

async function open(credential: P256Credential): Promise<State> {
  const account = await toSmartAccount(credential);
  const handle = await readHandle(account);
  if (handle) savePendingHandle(account.address, null);
  return { status: "ready", account, handle, pendingHandle: handle ? null : loadPendingHandle(account.address) };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  // The latest state, for callbacks that run after `signIn` in the same handler.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "ready", account: { address: "0x7a3f0000000000000000000000000000000091c2" } as CrackPaySmartAccount, handle: "sadiq", pendingHandle: null });
      return;
    }
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

  // Both work from the latest state rather than a captured one, so they behave
  // when called straight after `signIn` in the same handler.
  const refreshHandle = useCallback(async () => {
    const current = latest.current;
    if (current.status !== "ready") return;
    const handle = await readHandle(current.account);
    if (handle) savePendingHandle(current.account.address, null);
    setState((prev) =>
      prev.status === "ready" && prev.account.address === current.account.address
        ? { ...prev, handle, pendingHandle: handle ? null : prev.pendingHandle }
        : prev,
    );
  }, []);

  const setPendingHandle = useCallback((pendingHandle: string | null) => {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      savePendingHandle(prev.account.address, pendingHandle);
      return { ...prev, pendingHandle };
    });
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, refreshHandle, setPendingHandle }),
    [state, signIn, signOut, refreshHandle, setPendingHandle],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): Wallet {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside WalletProvider");
  return wallet;
}

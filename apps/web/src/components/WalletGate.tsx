"use client";

import { useEffect, useState, type ReactNode } from "react";
import { loadCredential, saveCredential } from "@/lib/session";
import {
  loginWithPasskey,
  registerPasskey,
  toSmartAccount,
  type CrackPaySmartAccount,
} from "@/lib/wallet";

type State =
  | { status: "loading" }
  | { status: "signed-out"; error?: string }
  | { status: "ready"; account: CrackPaySmartAccount };

function describe(error: unknown): string {
  console.error(error);
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Renders `children` once the user has a passkey smart account in this browser. */
export function WalletGate({ children }: { children: (account: CrackPaySmartAccount) => ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const credential = loadCredential();
    if (!credential) {
      // localStorage is browser-only, so this has to wait for hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "signed-out" });
      return;
    }
    toSmartAccount(credential).then(
      (account) => setState({ status: "ready", account }),
      (error: unknown) => setState({ status: "signed-out", error: describe(error) }),
    );
  }, []);

  async function signIn(mode: "register" | "login") {
    setBusy(true);
    try {
      const credential = mode === "register" ? await registerPasskey(username) : await loginWithPasskey();
      saveCredential(credential);
      setState({ status: "ready", account: await toSmartAccount(credential) });
    } catch (error) {
      setState({ status: "signed-out", error: describe(error) });
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "ready") return <>{children(state.account)}</>;
  if (state.status === "loading") return null;

  const button = "w-full rounded bg-foreground px-3 py-2 text-background disabled:opacity-40";
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-col gap-4 p-4 text-sm">
      <h1 className="text-lg font-semibold">Sign in to CrackPay</h1>
      <button className={button} disabled={busy} onClick={() => signIn("login")}>
        Sign in with a passkey
      </button>
      <input
        className="w-full rounded border border-neutral-400 px-3 py-2"
        placeholder="Name for a new passkey"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <button className={button} disabled={busy || !username} onClick={() => signIn("register")}>
        Create a passkey
      </button>
      {state.error && <p className="break-words text-red-600">{state.error}</p>}
    </main>
  );
}

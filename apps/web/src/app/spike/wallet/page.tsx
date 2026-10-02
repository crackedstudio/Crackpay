"use client";

// Phase 0 spike — delete once the wallet flow is proven.
import { useState } from "react";
import type { P256Credential } from "viem/account-abstraction";
import { parseRecipient } from "@/lib/address";
import { arcChain } from "@/lib/arc";
import { formatAmountExact, parseAmount } from "@/lib/money";
import { loadCredential, saveCredential } from "@/lib/session";
import { sendUsdc, type UserOpResult } from "@/lib/userop";
import {
  loginWithPasskey,
  registerPasskey,
  toSmartAccount,
  type CrackPaySmartAccount,
} from "@/lib/wallet";

const AMOUNT = parseAmount("0.1");
const explorer = arcChain.blockExplorers.default.url;


function describe(error: unknown): string {
  console.error(error);
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export default function WalletSpike() {
  const [account, setAccount] = useState<CrackPaySmartAccount | null>(null);
  const [username, setUsername] = useState("");
  const [recipient, setRecipient] = useState("");
  const [result, setResult] = useState<UserOpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  async function connect(credential: P256Credential) {
    saveCredential(credential);
    setAccount(await toSmartAccount(credential));
  }

  const register = () => run(async () => connect(await registerPasskey(username)));
  const login = () => run(async () => connect(await loginWithPasskey()));

  const restore = () =>
    run(async () => {
      const stored = loadCredential();
      if (!stored) throw new Error("No stored credential in this browser");
      setAccount(await toSmartAccount(stored));
    });

  const send = () =>
    run(async () => {
      if (!account) return;
      setResult(null);
      setResult(await sendUsdc(account, parseRecipient(recipient), AMOUNT));
    });

  const input = "w-full rounded border border-neutral-400 px-3 py-2";
  const button = "w-full rounded bg-foreground px-3 py-2 text-background disabled:opacity-40";

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-col gap-4 p-4 text-sm">
      <h1 className="text-lg font-semibold">Spike: passkey wallet</h1>

      {account ? (
        <>
          <p>
            Smart account
            <a
              className="block break-all font-mono underline"
              href={`${explorer}/address/${account.address}`}
              target="_blank"
              rel="noreferrer"
            >
              {account.address}
            </a>
          </p>
          <input
            className={input}
            placeholder="Recipient 0x…"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
          />
          <button className={button} disabled={busy} onClick={send}>
            Send {formatAmountExact(AMOUNT)} USDC (sponsored)
          </button>
        </>
      ) : (
        <>
          <input
            className={input}
            placeholder="Username for a new passkey"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <button className={button} disabled={busy || !username} onClick={register}>
            Register passkey
          </button>
          <button className={button} disabled={busy} onClick={login}>
            Log in with passkey
          </button>
          <button className={button} disabled={busy} onClick={restore}>
            Restore stored credential
          </button>
        </>
      )}

      {result && (
        <p className="break-all">
          {result.status === "confirmed" ? "Sent." : result.status === "reverted" ? "UserOp reverted." : "Submitted, no receipt."}{" "}
          userOp <span className="font-mono">{result.userOpHash}</span>
          {result.status !== "submitted_no_receipt" && (
            <a
              className="block font-mono underline"
              href={`${explorer}/tx/${result.transactionHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {result.transactionHash}
            </a>
          )}
        </p>
      )}
      {error && <p className="break-words text-red-600">{error}</p>}
    </main>
  );
}

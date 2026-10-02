"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { arcChain, publicClient } from "@/lib/arc";
import { handleRequest, toWireError } from "@/lib/miniapp/bridge";
import { RpcError } from "@/lib/miniapp/errors";
import { checkTransaction, type TransactionSummary } from "@/lib/miniapp/policy";
import { envelope, isMiniAppMessage, type MiniAppMessage } from "@/lib/miniapp/sdk";
import { formatAmountExact, nativeToBaseCeil } from "@/lib/money";
import { sendSponsoredUserOp } from "@/lib/userop";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import type { MiniApp } from "@/config/miniapps";

type Pending = { summary: TransactionSummary; resolve: (approved: boolean) => void };

// 2^128: anything at or above this is an "unlimited" allowance in practice.
const UNLIMITED = 1n << 128n;

function Summary({ app, summary }: { app: MiniApp; summary: TransactionSummary }) {
  if (summary.kind === "approve") {
    const amount = summary.amount >= UNLIMITED ? "an unlimited amount of" : formatAmountExact(summary.amount);
    return (
      <p>
        Allow {app.name} to spend {amount} {summary.token.symbol} from your balance.
      </p>
    );
  }
  return (
    <>
      <p className="text-2xl font-semibold">{formatAmountExact(nativeToBaseCeil(summary.value))} USDC</p>
      <p>will leave your balance and go to {app.name}.</p>
    </>
  );
}

export function MiniAppHost({ app, account }: { app: MiniApp; account: CrackPaySmartAccount }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);

  const appOrigin = new URL(app.url).origin;

  useEffect(() => {
    // A Mini App on CrackPay's own origin could reach into this page, so the
    // sandbox and every origin check below would mean nothing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (appOrigin === window.location.origin) setBlocked("This app shares CrackPay's origin and cannot be loaded.");
    // Pass the fragment through so shared links (…/apps/kashlink#<key>) open inside the app.
    else setSrc(app.url + window.location.hash);
  }, [app.url, appOrigin]);

  const confirm = useCallback(
    (summary: TransactionSummary) => new Promise<boolean>((resolve) => setPending({ summary, resolve })),
    [],
  );

  useEffect(() => {
    const reply = (message: MiniAppMessage) => frame.current?.contentWindow?.postMessage(message, appOrigin);

    const deps = {
      chainId: arcChain.id,
      account: account.address,
      check: (tx: Parameters<typeof checkTransaction>[1]) => checkTransaction(app.policy, tx),
      confirm,
      async send(tx: Parameters<typeof checkTransaction>[1]) {
        setSending(true);
        try {
          const result = await sendSponsoredUserOp(account, [tx]);
          if (result.status === "submitted_no_receipt") {
            throw new RpcError(-32603, `Operation ${result.userOpHash} was submitted but never confirmed`);
          }
          return { transactionHash: result.transactionHash, success: result.status === "confirmed" };
        } finally {
          setSending(false);
        }
      },
      // The method name is checked against the bridge's read allowlist before it gets here.
      read: (method: string, params: unknown) =>
        publicClient.request({ method, params } as Parameters<typeof publicClient.request>[0]),
    };

    async function onMessage(event: MessageEvent) {
      // Only this app's frame, and only from its registered origin.
      if (event.source !== frame.current?.contentWindow || event.origin !== appOrigin) return;
      if (!isMiniAppMessage(event.data)) return;
      const message = event.data;

      if (message.type === "hello") {
        reply(envelope({ type: "ready", chainId: `0x${arcChain.id.toString(16)}`, accounts: [account.address] }));
      } else if (message.type === "request") {
        try {
          const result = await handleRequest(deps, message.method, message.params);
          reply(envelope({ type: "response", id: message.id, result }));
        } catch (error) {
          console.error(`Mini App ${app.id}: ${message.method} failed`, error);
          reply(envelope({ type: "response", id: message.id, error: toWireError(error) }));
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [account, app, appOrigin, confirm]);

  function decide(approved: boolean) {
    pending?.resolve(approved);
    setPending(null);
  }

  if (blocked) return <p className="p-4 text-sm text-red-600">{blocked}</p>;

  const button = "flex-1 rounded px-3 py-2";
  return (
    <div className="relative mx-auto flex w-full max-w-[420px] flex-1 flex-col">
      {src && (
        <iframe
          ref={frame}
          src={src}
          title={app.name}
          className="w-full flex-1 border-0"
          // allow-same-origin gives the app its own real origin, which the origin
          // checks above depend on. It is safe only because that origin is not ours.
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          allow="clipboard-write"
          referrerPolicy="origin"
        />
      )}

      {(pending || sending) && (
        <div className="absolute inset-0 flex items-end bg-black/50">
          <div className="flex w-full flex-col gap-3 rounded-t-2xl bg-background p-4 text-sm">
            {pending ? (
              <>
                <p className="opacity-70">
                  {app.name} · {new URL(app.url).host}
                </p>
                <Summary app={app} summary={pending.summary} />
                <div className="flex gap-2">
                  <button className={`${button} border border-neutral-400`} onClick={() => decide(false)}>
                    Cancel
                  </button>
                  <button className={`${button} bg-foreground text-background`} onClick={() => decide(true)}>
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <p>Sending…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

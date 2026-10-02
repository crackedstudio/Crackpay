"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { Alert, Face } from "@/components/icons";
import { Button, EmptyState, LinkButton, Screen, Spinner } from "@/components/ui";
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
    const unlimited = summary.amount >= UNLIMITED;
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="numeric text-3xl font-semibold">
          {unlimited ? "Unlimited" : `${formatAmountExact(summary.amount)} ${summary.token.symbol}`}
        </p>
        <p className="text-muted">
          {app.name} is asking to spend {unlimited ? `as much ${summary.token.symbol} as it likes` : "up to this"} from your
          balance, now and later.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="numeric text-4xl font-semibold">${formatAmountExact(nativeToBaseCeil(summary.value))}</p>
      <p className="text-muted">will leave your balance and go to {app.name}.</p>
    </div>
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

  if (blocked) {
    return (
      <Screen back="/apps">
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<Alert className="h-6 w-6" />}
            title="This app can't be opened"
            body={blocked}
            action={
              <LinkButton href="/apps" size="md" variant="secondary">
                Back to apps
              </LinkButton>
            }
          />
        </div>
      </Screen>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[460px] flex-1 flex-col">
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

      {pending && (
        <Sheet title="Approve this?" onClose={() => decide(false)}>
          {/* Who is asking, stated plainly: the host name is the only thing that
              cannot be faked by the app's own content. */}
          <p className="text-center text-sm text-muted">
            Requested by <span className="font-medium text-foreground">{new URL(app.url).host}</span>
          </p>
          <div className="py-2">
            <Summary app={app} summary={pending.summary} />
          </div>
          <div className="flex flex-col gap-2 pb-2">
            <Button onClick={() => decide(true)}>
              <Face className="h-5 w-5" />
              Approve
            </Button>
            <Button variant="ghost" onClick={() => decide(false)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}

      {sending && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
          <Spinner className="h-6 w-6 text-muted" />
          <p className="text-sm text-muted">Sending…</p>
        </div>
      )}
    </div>
  );
}

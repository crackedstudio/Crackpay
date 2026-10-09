"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Sheet } from "@/components/Sheet";
import { Alert, ArrowLeft, External, Face, Info, Refresh, Shield } from "@/components/icons";
import { Button, Callout, EmptyState, IconButton, LinkButton, Screen, Spinner, Stamp } from "@/components/ui";
import { arcChain, publicClient } from "@/lib/arc";
import { useUsdcBalance } from "@/lib/balance";
import { developer } from "@/lib/developer";
import { dollars } from "@/lib/format";
import { handleRequest, toWireError } from "@/lib/miniapp/bridge";
import { RpcError } from "@/lib/miniapp/errors";
import { CATEGORY_LABELS, LISTING_CATEGORIES } from "@/lib/miniapp/listing";
import { checkTransaction, type TransactionSummary } from "@/lib/miniapp/policy";
import { rememberApp } from "@/lib/miniapp/recent";
import { envelope, isMiniAppMessage, type MiniAppMessage } from "@/lib/miniapp/sdk";
import { formatAmountExact, nativeToBaseCeil } from "@/lib/money";
import { sendUserOp } from "@/lib/userop";
import type { Address } from "viem";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import type { MiniApp } from "@/config/miniapps";
import { FREE_FEES_PAUSED, NETWORK_FEE } from "@/config/fees";

type Pending = { summary: TransactionSummary; resolve: (approved: boolean) => void };
/** The last word CrackPay gets after money moves, before the app has the screen back. */
type Done = { title: string; detail: string };

// 2^128: anything at or above this is an "unlimited" allowance in practice.
const UNLIMITED = 1n << 128n;

/** How long to wait for an app's own page before offering a way out. */
const STALL_MS = 10_000;

/** How long the confirmation stays up once a request has gone through. */
const DONE_MS = 1_700;

/**
 * Who the money is going to. A listed app is named; a Developer-mode test app is
 * not, because nobody has checked that its name is its own — the raw address is
 * the only honest answer there.
 */
function Recipient({ app, address }: { app: MiniApp; address: Address }) {
  if (!app.test) return <>{app.name}</>;
  return <span className="break-all font-mono text-sm">{address}</span>;
}

/**
 * What leaves the dollar balance if this request goes through, in 6-decimal base
 * units. Null when nothing leaves it now: an allowance, a call that carries no
 * payment, or a transfer of some other token.
 */
function usdcLeaving(summary: TransactionSummary): bigint | null {
  if (summary.kind === "contract") return summary.value > 0n ? nativeToBaseCeil(summary.value) : null;
  if (summary.kind === "transfer" && summary.token.symbol === "USDC") return summary.amount;
  return null;
}

/** The question being asked, named for what it actually does. */
function requestTitle(summary: TransactionSummary): string {
  if (summary.kind === "approve") return "Allow spending";
  if (summary.kind === "transfer") return "Confirm payment";
  return summary.value > 0n ? "Confirm payment" : "Confirm action";
}

function doneFor(summary: TransactionSummary): Done {
  if (summary.kind === "approve") return { title: "Allowed", detail: "The app can spend up to that amount." };
  if (summary.kind === "transfer") {
    return { title: "Sent", detail: `${formatAmountExact(summary.amount)} ${summary.token.symbol}` };
  }
  if (summary.value > 0n) return { title: "Sent", detail: dollars(nativeToBaseCeil(summary.value)) };
  return { title: "Done", detail: "The app has what it asked for." };
}

function Summary({ app, summary }: { app: MiniApp; summary: TransactionSummary }) {
  if (summary.kind === "approve") {
    const unlimited = summary.amount >= UNLIMITED;
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="figure text-3xl">
          {unlimited ? "Unlimited" : `${formatAmountExact(summary.amount)} ${summary.token.symbol}`}
        </p>
        <p className="text-muted">
          <Recipient app={app} address={summary.spender} /> is asking to spend{" "}
          {unlimited ? `as much ${summary.token.symbol} as it likes` : "up to this"} from your balance, now and later.
        </p>
      </div>
    );
  }
  if (summary.kind === "transfer") {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="figure text-4xl">
          {formatAmountExact(summary.amount)} {summary.token.symbol}
        </p>
        <p className="text-muted">
          will leave your balance and go to <Recipient app={app} address={summary.to} />.
        </p>
      </div>
    );
  }
  // A call that carries no payment is not a payment screen: say so rather than
  // putting "$0.00" in the place a figure goes.
  if (summary.value === 0n) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-bold">No money leaves your balance</p>
        <p className="text-muted">
          <Recipient app={app} address={summary.to} /> is asking to run something on your behalf.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="figure text-4xl">${formatAmountExact(nativeToBaseCeil(summary.value))}</p>
      <p className="text-muted">
        will leave your balance and go to <Recipient app={app} address={summary.to} />.
      </p>
    </div>
  );
}

/** One fact being checked at a glance, in the confirmation sheet. */
function Fact({ label, value, tone }: { label: string; value: string; tone?: "money" }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className={`numeric text-sm font-semibold ${tone === "money" ? "text-money" : ""}`}>{value}</span>
    </div>
  );
}

export function MiniAppHost({
  app,
  account,
  handle,
}: {
  app: MiniApp;
  account: CrackPaySmartAccount;
  handle: string | null;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [about, setAbout] = useState(false);
  /** False until the app's own page has painted, so the frame is never a blank hole. */
  const [loaded, setLoaded] = useState(false);
  const [stalled, setStalled] = useState(false);
  /** Bumped to throw the frame away and start the app again. */
  const [attempt, setAttempt] = useState(0);
  /** What the user last agreed to, so the result can be named after it. */
  const confirmed = useRef<TransactionSummary | null>(null);

  const { balance } = useUsdcBalance(account.address);
  const appOrigin = new URL(app.url).origin;
  const host = new URL(app.url).host;

  /**
   * Leaving an app is a full page load, not a client-side route change: which
   * origins this page may frame is a header on this document, and a client-side
   * navigation would carry that permission on to the next screen.
   */
  const exitHref = app.test ? "/settings/developer" : "/apps";

  useEffect(() => {
    // A Mini App on CrackPay's own origin could reach into this page, so the
    // sandbox and every origin check below would mean nothing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (appOrigin === window.location.origin) setBlocked("This app shares CrackPay's origin and cannot be loaded.");
    // Pass the fragment through so shared links (…/apps/kashlink#<key>) open inside the app.
    else setSrc(app.url + window.location.hash);
  }, [app.url, appOrigin]);

  // A listed app the user opened belongs at the front of the Apps screen. A test
  // app does not: it is a URL being debugged, not something they chose.
  useEffect(() => {
    if (!app.test) rememberApp(app.id);
  }, [app.id, app.test]);

  // An app that never paints should not leave the user staring at its splash.
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(timer);
  }, [loaded, attempt]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(null), DONE_MS);
    return () => clearTimeout(timer);
  }, [done]);

  const reload = useCallback(() => {
    setLoaded(false);
    setStalled(false);
    setAttempt((count) => count + 1);
  }, []);

  const confirm = useCallback(
    (summary: TransactionSummary) =>
      new Promise<boolean>((resolve) =>
        setPending({
          summary,
          resolve: (approved) => {
            confirmed.current = approved ? summary : null;
            resolve(approved);
          },
        }),
      ),
    [],
  );

  useEffect(() => {
    const reply = (message: MiniAppMessage) => frame.current?.contentWindow?.postMessage(message, appOrigin);

    const deps = {
      chainId: arcChain.id,
      account: account.address,
      handle,
      check: (tx: Parameters<typeof checkTransaction>[1]) => checkTransaction(app.policy, tx),
      confirm,
      async send(tx: Parameters<typeof checkTransaction>[1]) {
        setSending(true);
        try {
          // A USDC transfer draws on the same balance a self-paid fee comes from.
          // (Native `value` is counted by sendUserOp from the call itself.)
          const summary = checkTransaction(app.policy, tx);
          const spend = summary.kind === "transfer" && summary.token.symbol === "USDC" ? summary.amount : 0n;
          const result = await sendUserOp(account, [tx], spend);
          if (result.status === "submitted_no_receipt") {
            throw new RpcError(-32603, `Operation ${result.userOpHash} was submitted but never confirmed`);
          }
          const success = result.status === "confirmed";
          // CrackPay says what happened to the money, rather than leaving the
          // only acknowledgement to whatever the app chooses to show.
          if (success && confirmed.current) setDone(doneFor(confirmed.current));
          return { transactionHash: result.transactionHash, success };
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
        // The app's own code is running, so it is up whatever its page load said.
        setLoaded(true);
        setStalled(false);
        reply(envelope({ type: "ready", chainId: `0x${arcChain.id.toString(16)}`, accounts: [account.address] }));
      } else if (message.type === "request") {
        // Developer settings → Log Mini App messages.
        const log = developer.isLoggingMessages();
        if (log) console.info(`[Mini App ${app.id}] → ${message.method}`, message.params ?? []);
        try {
          const result = await handleRequest(deps, message.method, message.params);
          if (log) console.info(`[Mini App ${app.id}] ← ${message.method}`, result);
          reply(envelope({ type: "response", id: message.id, result }));
        } catch (error) {
          console.error(`Mini App ${app.id}: ${message.method} failed`, error);
          const wire = toWireError(error);
          if (log) console.info(`[Mini App ${app.id}] ← ${message.method} error ${wire.code}`, wire.message);
          reply(envelope({ type: "response", id: message.id, error: wire }));
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [account, app, appOrigin, confirm, handle]);

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

  const leaving = pending ? usdcLeaving(pending.summary) : null;
  const short = leaving !== null && balance !== null && leaving > balance;
  const category = app.category && (CATEGORY_LABELS[app.category as (typeof LISTING_CATEGORIES)[number]] ?? null);

  return (
    <div className="relative mx-auto flex w-full max-w-[460px] flex-1 flex-col overflow-hidden">
      {/* CrackPay's own bar, above the app's page: whose screen this is, and the
          balance the app is about to spend from. */}
      <header className="flex items-center gap-1.5 border-b-[1.5px] border-ink bg-paper px-1.5 pt-[env(safe-area-inset-top)]">
        <a
          href={exitHref}
          aria-label={`Close ${app.name}`}
          className="pressable flex h-12 w-11 shrink-0 items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <span className="flex min-w-0 flex-1 flex-col py-2 leading-tight">
          <span className="truncate text-[0.9375rem] font-bold">{app.name}</span>
          <span className="truncate font-mono text-[0.625rem] text-muted">{host}</span>
        </span>
        {/* The balance the app is about to spend from, ruled off as a fact. */}
        {balance !== null && (
          <span className="numeric flex h-[1.875rem] shrink-0 items-center rounded-sm border-[1.5px] border-ink px-2.5 text-sm font-extrabold">
            {dollars(balance)}
          </span>
        )}
        <IconButton label={`About ${app.name}`} onClick={() => setAbout(true)} className="shrink-0 text-muted">
          <Info className="h-5 w-5" />
        </IconButton>
      </header>

      {app.test && (
        <p className="label flex items-center gap-2 border-b-[1.5px] border-danger bg-danger-soft px-4 py-1.5 text-danger">
          <Alert className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Test app · not reviewed by CrackPay</span>
        </p>
      )}

      <div className="relative flex-1">
        {src && (
          <iframe
            key={attempt}
            ref={frame}
            src={src}
            title={app.name}
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            // allow-same-origin gives the app its own real origin, which the origin
            // checks above depend on. It is safe only because that origin is not ours.
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
            allow="clipboard-write"
            referrerPolicy="origin"
          />
        )}

        {/* Opening an app looks like opening an app, instead of a white rectangle. */}
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3.5 bg-paper px-8 text-center">
            <AppIcon app={app} size="lg" className="animate-pop shadow-slab" />
            <div className="flex flex-col gap-0.5">
              <p className="text-[1.1875rem] font-extrabold">{app.name}</p>
              {app.publisher && <p className="text-sm text-muted">{app.publisher}</p>}
            </div>

            {stalled ? (
              <div className="flex w-full max-w-[17rem] flex-col gap-3 pt-1">
                <p className="text-sm leading-5 text-muted">
                  This is taking longer than it should. The app may be down, or it may not allow CrackPay to open it.
                </p>
                <Button size="md" variant="secondary" onClick={reload}>
                  <Refresh className="h-4 w-4" />
                  Try again
                </Button>
                <a href={exitHref} className="text-sm font-medium text-muted">
                  Back to apps
                </a>
              </div>
            ) : (
              <>
                {/* A bar that fills rather than a spinner that turns: the
                    handover has a length, and this says how far through it is. */}
                <span className="mt-1.5 h-1 w-[8.75rem] overflow-hidden rounded-sm border-[1.5px] border-ink">
                  <span aria-hidden className="block h-full origin-left animate-bar bg-ink" />
                </span>
                <p className="font-mono text-[0.6875rem] text-muted">Opening…</p>
              </>
            )}

            {/* The handover claimed out loud: the app is a guest here. */}
            <p className="label absolute bottom-7 flex h-[1.875rem] items-center gap-2 rounded-sm border-[1.5px] border-ink px-3 text-ink">
              <Shield className="h-3.5 w-3.5" />
              Runs inside CrackPay
            </p>
          </div>
        )}
      </div>

      {about && (
        <Sheet title="About this app" onClose={() => setAbout(false)}>
          <div className="flex items-center gap-3.5">
            <AppIcon app={app} size="lg" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-bold">{app.name}</span>
              {app.publisher && <span className="truncate text-sm text-muted">{app.publisher}</span>}
              {category && <span className="truncate text-sm text-muted">{category}</span>}
            </span>
          </div>

          <p className="text-sm leading-5 text-muted">{app.description}</p>

          <div className="divide-y divide-hair overflow-hidden rounded-lg border-[1.5px] border-ink">
            <a
              href={app.url}
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="text-sm text-muted">Website</span>
              <span className="ml-auto min-w-0 truncate text-sm font-medium">{host}</span>
              <External className="h-4 w-4 shrink-0 text-muted" />
            </a>
            {handle && <Fact label="Paying as" value={`@${handle}`} />}
            <Fact label="Network fee" value={NETWORK_FEE} tone={FREE_FEES_PAUSED ? undefined : "money"} />
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {[
              "It asks you before anything leaves your balance.",
              "It never sees your passkey and can't sign for you.",
              app.policy.tokens.length > 0
                ? `It can ask to spend your ${app.policy.tokens.map((token) => token.symbol).join(" or ")}.`
                : null,
            ]
              .filter((line): line is string => line !== null)
              .map((line, index) => (
                <li key={line} className="flex gap-2.5">
                  <span className="pt-0.5 font-mono text-[0.6875rem] font-semibold">{`0${index + 1}`}</span>
                  <span className="leading-5">{line}</span>
                </li>
              ))}
          </ul>

          {app.test && (
            <Callout tone="error">
              This app was loaded in Developer mode. CrackPay has not reviewed it and has not checked what it calls.
            </Callout>
          )}

          <div className="flex flex-col gap-2 pb-2">
            <Button
              size="md"
              variant="secondary"
              onClick={() => {
                setAbout(false);
                reload();
              }}
            >
              <Refresh className="h-4 w-4" />
              Reload app
            </Button>
            <a href={exitHref} className="pressable flex h-11 w-full items-center justify-center text-sm font-medium text-muted">
              Close {app.name}
            </a>
          </div>
        </Sheet>
      )}

      {pending && (
        <Sheet title={requestTitle(pending.summary)} onClose={() => decide(false)}>
          {/* Who is asking, stated plainly: the host name is the only thing that
              cannot be faked by the app's own content. */}
          <div className="flex items-center gap-2.5 self-start rounded-md border-[1.5px] border-ink px-2.5 py-2">
            <AppIcon app={app} size="sm" className="h-7 w-7 rounded-lg text-[0.8125rem]" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-bold">Requested by {app.name}</span>
              <span className="truncate font-mono text-[0.625rem] text-muted">{host}</span>
            </span>
          </div>

          <div className="py-1">
            <Summary app={app} summary={pending.summary} />
          </div>

          <div className="divide-y divide-hair overflow-hidden rounded-lg border-[1.5px] border-ink">
            <Fact label="Network fee" value={NETWORK_FEE} tone={FREE_FEES_PAUSED ? undefined : "money"} />
            {balance !== null && <Fact label="Your balance" value={dollars(balance)} />}
            {balance !== null && leaving !== null && !short && (
              <Fact label="Left after" value={dollars(balance - leaving)} />
            )}
          </div>

          {short && <Callout tone="error">That is more than your balance, so this payment would fail.</Callout>}

          {app.test && (
            <Callout tone="error">
              This is a test app loaded in Developer mode. CrackPay has not reviewed it and has not checked the contract it
              is calling. Only confirm if it is your own app.
            </Callout>
          )}

          <div className="flex flex-col gap-2 pb-2">
            <Button onClick={() => decide(true)} disabled={short}>
              <Face className="h-5 w-5" />
              {pending.summary.kind === "approve" ? "Allow" : "Confirm"}
            </Button>
            <Button variant="ghost" className="h-12" onClick={() => decide(false)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}

      {sending && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-paper">
          <Spinner className="h-6 w-6 text-muted" />
          <p className="font-mono text-xs text-muted">Sending…</p>
        </div>
      )}

      {done && !sending && (
        <div
          role="status"
          className="absolute inset-0 z-40 flex animate-fade flex-col items-center justify-center gap-5 bg-paper"
        >
          <Stamp size="md" />
          <p className="display text-3xl">{done.title}</p>
          <p className="numeric font-mono text-[0.6875rem] text-muted">{done.detail}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { isAddressEqual } from "viem";
import { RequireAccount } from "@/components/RequireAccount";
import { Button, ErrorText, LinkButton, Screen, TextField } from "@/components/ui";
import { ONBOARDING_MODE } from "@/config/onboarding";
import { arcChain } from "@/lib/arc";
import { useUsdcBalance } from "@/lib/balance";
import { dollars, errorText } from "@/lib/format";
import { MoneyError, parseAmount } from "@/lib/money";
import { resolveRecipient, type Recipient } from "@/lib/recipient";
import { sendUsdc, type UserOpResult } from "@/lib/userop";
import type { CrackPaySmartAccount } from "@/lib/wallet";

type Step =
  | { name: "recipient" }
  | { name: "amount"; recipient: Recipient }
  | { name: "review"; recipient: Recipient; amount: bigint }
  | { name: "sending"; recipient: Recipient; amount: bigint }
  | { name: "done"; recipient: Recipient; amount: bigint; result: UserOpResult };

function amountProblem(input: string, balance: bigint | null): string | null {
  if (!input) return null;
  let amount: bigint;
  try {
    amount = parseAmount(input);
  } catch (error) {
    if (error instanceof MoneyError) {
      return error.code === "TOO_MANY_DECIMALS" ? "Use at most 6 decimal places." : "Enter an amount like 5 or 12.50.";
    }
    throw error;
  }
  if (amount === 0n) return "Enter an amount above zero.";
  if (balance !== null && amount > balance) return `You have ${dollars(balance)} available.`;
  return null;
}

function SendFlow({ account }: { account: CrackPaySmartAccount }) {
  const params = useSearchParams();
  const { balance, refresh } = useUsdcBalance(account.address);
  const [step, setStep] = useState<Step>({ name: "recipient" });
  const [to, setTo] = useState(params.get("to") ?? "");
  const [amountInput, setAmountInput] = useState(params.get("amount") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function findRecipient(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const recipient = await resolveRecipient(to);
      if (isAddressEqual(recipient.address, account.address)) throw new Error("That's you. Pick someone else to pay.");
      setStep({ name: "amount", recipient });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function send(recipient: Recipient, amount: bigint) {
    setError(null);
    setStep({ name: "sending", recipient, amount });
    try {
      const result = await sendUsdc(account, recipient.address, amount);
      refresh();
      setStep({ name: "done", recipient, amount, result });
    } catch (caught) {
      // Nothing was submitted: the passkey was declined or the bundler refused it.
      setError(errorText(caught));
      setStep({ name: "review", recipient, amount });
    }
  }

  if (step.name === "recipient") {
    return (
      <Screen title="Send" back="/">
        <form className="flex flex-1 flex-col gap-5" onSubmit={findRecipient}>
          <TextField
            label="Who are you paying?"
            placeholder={ONBOARDING_MODE === "phone" ? "@handle, phone number or address" : "@handle or address"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            value={to}
            onChange={(event) => setTo(event.target.value)}
            hint={ONBOARDING_MODE === "phone" ? "Phone numbers need the country code, like +234…" : undefined}
          />
          <ErrorText>{error}</ErrorText>
          <div className="mt-auto">
            <Button disabled={busy || !to.trim()}>{busy ? "Looking…" : "Continue"}</Button>
          </div>
        </form>
      </Screen>
    );
  }

  if (step.name === "amount") {
    const { recipient } = step;
    const problem = amountProblem(amountInput, balance);
    return (
      <Screen title={`Pay ${recipient.label}`} back="/">
        <form
          className="flex flex-1 flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            setStep({ name: "review", recipient, amount: parseAmount(amountInput) });
          }}
        >
          <TextField
            label="Amount in dollars"
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            hint={balance === null ? undefined : `${dollars(balance)} available`}
          />
          <ErrorText>{problem}</ErrorText>
          <div className="mt-auto flex flex-col gap-2">
            <Button disabled={!amountInput || problem !== null}>Review</Button>
            <Button type="button" variant="ghost" onClick={() => setStep({ name: "recipient" })}>
              Change recipient
            </Button>
          </div>
        </form>
      </Screen>
    );
  }

  if (step.name === "review" || step.name === "sending") {
    const { recipient, amount } = step;
    const sending = step.name === "sending";
    return (
      <Screen title="Review" back="/">
        <section className="flex flex-col items-center gap-1 py-8">
          <span className="text-5xl font-semibold tracking-tight tabular-nums">{dollars(amount)}</span>
          <span className="text-muted">to {recipient.label}</span>
        </section>
        <dl className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card px-4 text-sm">
          <div className="flex justify-between py-3">
            <dt className="text-muted">Fee</dt>
            <dd>Free</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-muted">Arrives</dt>
            <dd>Instantly</dd>
          </div>
        </dl>
        <ErrorText>{error}</ErrorText>
        <div className="mt-auto flex flex-col gap-2">
          <Button disabled={sending} onClick={() => send(recipient, amount)}>
            {sending ? "Sending…" : "Send"}
          </Button>
          <Button variant="ghost" disabled={sending} onClick={() => setStep({ name: "amount", recipient })}>
            Change amount
          </Button>
        </div>
      </Screen>
    );
  }

  const { recipient, amount, result } = step;
  const explorer = arcChain.blockExplorers.default.url;
  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {result.status === "confirmed" && (
          <>
            <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl text-accent-foreground">
              ✓
            </span>
            <h1 className="text-2xl font-semibold">Sent</h1>
            <p className="text-muted">
              {dollars(amount)} to {recipient.label}
            </p>
          </>
        )}
        {result.status === "reverted" && (
          <>
            <h1 className="text-2xl font-semibold">Payment didn&apos;t go through</h1>
            <p className="text-muted">Nothing left your balance. You can try again.</p>
          </>
        )}
        {result.status === "submitted_no_receipt" && (
          <>
            <h1 className="text-2xl font-semibold">We couldn&apos;t confirm this payment</h1>
            <p className="text-muted">
              It was submitted, but the network never confirmed it. Check your balance and activity before sending again, so
              you don&apos;t pay twice.
            </p>
          </>
        )}
        {result.status !== "submitted_no_receipt" && (
          <a className="text-sm text-muted underline" href={`${explorer}/tx/${result.transactionHash}`} target="_blank" rel="noreferrer">
            View receipt
          </a>
        )}
      </div>
      <LinkButton href="/">Done</LinkButton>
    </Screen>
  );
}

export default function Send() {
  return (
    <RequireAccount>
      {(account) => (
        // useSearchParams needs a Suspense boundary to prerender.
        <Suspense>
          <SendFlow account={account} />
        </Suspense>
      )}
    </RequireAccount>
  );
}

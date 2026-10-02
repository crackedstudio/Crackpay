"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { isAddressEqual } from "viem";
import { AmountPad } from "@/components/AmountPad";
import { Avatar } from "@/components/Avatar";
import { RequireAccount } from "@/components/RequireAccount";
import { Alert, Check, External, Face } from "@/components/icons";
import {
  Button,
  Callout,
  Card,
  ErrorText,
  LinkButton,
  ListRow,
  Screen,
  Spinner,
  TextField,
} from "@/components/ui";
import { ONBOARDING_MODE } from "@/config/onboarding";
import { arcChain } from "@/lib/arc";
import { useUsdcBalance } from "@/lib/balance";
import { dollars, errorText } from "@/lib/format";
import { MoneyError, parseAmount, toInputValue } from "@/lib/money";
import { useRecents } from "@/lib/recents";
import { resolveRecipient, type Recipient } from "@/lib/recipient";
import { sendUsdc, type UserOpResult } from "@/lib/userop";
import type { CrackPaySmartAccount } from "@/lib/wallet";

type Step =
  /** A payment link arrived with a recipient on it; look them up before asking anything. */
  | { name: "resolving" }
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
  if (balance !== null && amount > balance) return `You only have ${dollars(balance)}.`;
  return null;
}

function SendFlow({ account }: { account: CrackPaySmartAccount }) {
  const params = useSearchParams();
  const linkedTo = params.get("to");
  const { balance, refresh } = useUsdcBalance(account.address);
  const recents = useRecents(account.address);
  const [step, setStep] = useState<Step>(linkedTo ? { name: "resolving" } : { name: "recipient" });
  const [to, setTo] = useState(linkedTo ?? "");
  const [amountInput, setAmountInput] = useState(params.get("amount") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(input: string) {
    const recipient = await resolveRecipient(input);
    if (isAddressEqual(recipient.address, account.address)) throw new Error("That's you. Pick someone else to pay.");
    return recipient;
  }

  // A payment link should land on the amount — or on the review, if it named one —
  // rather than make the user retype a recipient the link already gave us.
  useEffect(() => {
    if (!linkedTo) return;
    let current = true;
    pick(linkedTo).then(
      (recipient) => {
        if (!current) return;
        const linkedAmount = params.get("amount");
        let amount: bigint | null = null;
        try {
          if (linkedAmount) amount = parseAmount(linkedAmount);
        } catch {
          // A malformed amount on the link is not worth an error screen; just ask for one.
        }
        setStep(amount && amount > 0n ? { name: "review", recipient, amount } : { name: "amount", recipient });
      },
      (caught: unknown) => {
        if (!current) return;
        setError(errorText(caught));
        setStep({ name: "recipient" });
      },
    );
    return () => {
      current = false;
    };
    // Resolving the link is a one-off: later edits go through the steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedTo]);

  async function findRecipient(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setStep({ name: "amount", recipient: await pick(to) });
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

  function startOver() {
    setError(null);
    setTo("");
    setAmountInput("");
    setStep({ name: "recipient" });
  }

  if (step.name === "resolving") {
    return (
      <Screen back="/">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
          <Spinner className="h-6 w-6" />
          <p className="text-sm">Looking up {linkedTo}…</p>
        </div>
      </Screen>
    );
  }

  if (step.name === "recipient") {
    return (
      <Screen
        title="Send"
        back="/"
        footer={
          <Button loading={busy} disabled={!to.trim()} form="recipient-form">
            Continue
          </Button>
        }
      >
        <form id="recipient-form" className="flex flex-1 flex-col gap-6" onSubmit={findRecipient}>
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

          {recents.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Recent</h2>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {recents.map((recent) => (
                  <button
                    key={recent.address}
                    type="button"
                    // The address is already known, so this needs no lookup at all.
                    onClick={() => setStep({ name: "amount", recipient: { address: recent.address, label: recent.label } })}
                    className="pressable flex w-16 shrink-0 flex-col items-center gap-1.5"
                  >
                    <Avatar seed={recent.label} />
                    <span className="w-full truncate text-center text-xs text-muted">{recent.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </form>
      </Screen>
    );
  }

  if (step.name === "amount") {
    const { recipient } = step;
    const problem = amountProblem(amountInput, balance);
    const chips = [
      { label: "$5", amount: "5" },
      { label: "$10", amount: "10" },
      { label: "$20", amount: "20" },
      ...(balance !== null && balance > 0n ? [{ label: "Max", amount: toInputValue(balance) }] : []),
    ];
    return (
      <Screen
        back={() => setStep({ name: "recipient" })}
        lead={
          <span className="flex items-center gap-2.5">
            <Avatar seed={recipient.label} size="sm" />
            <span className="truncate font-semibold">{recipient.label}</span>
          </span>
        }
        footer={
          <Button
            disabled={!amountInput || problem !== null}
            onClick={() => setStep({ name: "review", recipient, amount: parseAmount(amountInput) })}
          >
            Review payment
          </Button>
        }
      >
        <AmountPad
          value={amountInput}
          onChange={setAmountInput}
          caption={balance === null ? undefined : `${dollars(balance)} available`}
          problem={problem}
          chips={chips}
        />
      </Screen>
    );
  }

  if (step.name === "review" || step.name === "sending") {
    const { recipient, amount } = step;
    const sending = step.name === "sending";
    return (
      <Screen
        title="Review"
        back={sending ? undefined : () => setStep({ name: "amount", recipient })}
        footer={
          <>
            <Button loading={sending} onClick={() => send(recipient, amount)}>
              {sending ? "Sending…" : `Send ${dollars(amount)}`}
            </Button>
            {!sending && (
              <p className="flex items-center justify-center gap-2 text-xs text-muted">
                <Face className="h-4 w-4" />
                Your phone will ask you to approve this
              </p>
            )}
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 py-8">
          <Avatar seed={recipient.label} size="lg" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="numeric text-[3.25rem] font-semibold leading-none">{dollars(amount)}</span>
            <span className="text-muted">to {recipient.label}</span>
          </div>
        </div>

        <Card className="divide-y divide-line">
          <ListRow layout="inline" label="Fee" value="Free" />
          <ListRow layout="inline" label="Arrives" value="Instantly" />
          {balance !== null && <ListRow layout="inline" label="Left after this" value={dollars(balance - amount)} />}
        </Card>

        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  /* ----------------------------------------------------------------- the end */

  const { recipient, amount, result } = step;
  const explorer = arcChain.blockExplorers.default.url;

  // Each outcome gets its own way out. A payment that went through offers another
  // one; a payment we could not confirm sends the user to check their activity
  // instead of to a retry, because sending again could pay twice.
  if (result.status === "confirmed") {
    return (
      <Screen
        footer={
          <>
            <LinkButton href="/">Done</LinkButton>
            <Button variant="ghost" onClick={startOver}>
              Send another payment
            </Button>
          </>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="flex h-20 w-20 animate-pop items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-10 w-10" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">Sent</h1>
            <p className="text-lg text-muted">
              {dollars(amount)} to {recipient.label}
            </p>
          </div>
          <a
            className="pressable mt-2 flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-medium"
            href={`${explorer}/tx/${result.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View receipt
            <External className="h-4 w-4" />
          </a>
        </div>
      </Screen>
    );
  }

  if (result.status === "reverted") {
    return (
      <Screen
        footer={
          <>
            <Button onClick={() => setStep({ name: "review", recipient, amount })}>Try again</Button>
            <LinkButton href="/" variant="ghost">
              Back to my account
            </LinkButton>
          </>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft text-danger">
            <Alert className="h-10 w-10" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">That payment didn&apos;t go through</h1>
            <p className="text-muted">
              Nothing left your balance. You still have {balance === null ? "your money" : dollars(balance)}.
            </p>
          </div>
          <a
            className="text-sm text-muted underline"
            href={`${explorer}/tx/${result.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            See what happened
          </a>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <LinkButton href="/activity">Check my activity</LinkButton>
          <LinkButton href="/" variant="ghost">
            Back to my account
          </LinkButton>
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-warning-soft text-warning">
          <Alert className="h-10 w-10" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">We couldn&apos;t confirm this</h1>
          <p className="text-muted">
            The payment was sent but the network never confirmed it, so we don&apos;t know whether it landed.
          </p>
        </div>
        <Callout tone="info">
          Check your activity and balance before sending again — otherwise you could pay {recipient.label} twice.
        </Callout>
      </div>
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

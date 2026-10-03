"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { isAddressEqual } from "viem";
import { AmountPad } from "@/components/AmountPad";
import { Avatar } from "@/components/Avatar";
import { RequireAccount } from "@/components/RequireAccount";
import { Alert, External, Face, Receipt } from "@/components/icons";
import {
  Button,
  Callout,
  Card,
  ErrorText,
  Label,
  LinkButton,
  Screen,
  Spinner,
  Stamp,
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

/** Who a payment is going to, as a chip: the avatar carries the recognition. */
function RecipientChip({ label }: { label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar seed={label} size="sm" />
      <span className="truncate font-semibold">{label}</span>
    </span>
  );
}

/**
 * An outcome that is not a success. Left-aligned and stated plainly, because
 * the first question in every failure is "where is my money" and that belongs
 * in the heading, not under an icon.
 */
function Outcome({
  tone,
  title,
  children,
  footer,
}: {
  tone: "danger" | "warn";
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Screen footer={footer}>
      <div className="flex flex-1 flex-col justify-center gap-5.5">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 ${
            tone === "danger" ? "border-danger bg-danger-soft text-danger" : "border-warn bg-warn-soft text-warn"
          }`}
        >
          <Alert className="h-8 w-8" strokeWidth={2} />
        </span>
        <h1 className="ask text-3xl font-extrabold">{title}</h1>
        {children}
      </div>
    </Screen>
  );
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
          <p className="font-mono text-xs">Looking up {linkedTo}…</p>
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
            tone="question"
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
            <section className="flex flex-col gap-3">
              <Label>Recent</Label>
              <div className="-mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recents.map((recent) => (
                  <button
                    key={recent.address}
                    type="button"
                    // The address is already known, so this needs no lookup at all.
                    onClick={() => setStep({ name: "amount", recipient: { address: recent.address, label: recent.label } })}
                    className="pressable flex w-16 shrink-0 flex-col items-center gap-1.5"
                  >
                    <Avatar seed={recent.label} size="lg" ring />
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
        lead={<RecipientChip label={recipient.label} />}
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
            <Button loading={sending} onClick={() => send(recipient, amount)} className="font-bold">
              {sending ? "Sending…" : `Send ${dollars(amount)}`}
            </Button>
            <p
              className={`flex items-center justify-center gap-2 py-1 text-xs text-muted ${
                sending ? "invisible" : ""
              }`}
            >
              <Face className="h-4 w-4" />
              Your phone will ask you to approve this
            </p>
          </>
        }
      >
        {/* The amount leads, then who it is going to. That order is the whole screen. */}
        <div className="flex flex-col gap-1.5 pb-4.5 pt-5.5">
          <Label>You&apos;re sending</Label>
          <span className="figure text-[3.75rem]">{dollars(amount)}</span>
          <span className="mt-2.5 flex items-center gap-2.5 text-[1.0625rem]">
            <Avatar seed={recipient.label} size="sm" />
            <span>
              to <span className="font-bold">{recipient.label}</span>
            </span>
          </span>
        </div>

        <Card>
          <div className="flex items-center px-4 py-3.5">
            <span className="text-sm text-muted">Fee</span>
            <span className="ml-auto font-semibold">Free</span>
          </div>
          <div className="flex items-center border-t border-hair px-4 py-3.5">
            <span className="text-sm text-muted">Arrives</span>
            <span className="ml-auto font-semibold">Instantly</span>
          </div>
          {/* The money consequence gets the heaviest weight on the screen. */}
          {balance !== null && (
            <div className="flex items-center rounded-b-md border-t-[1.5px] border-ink bg-surface px-4 py-3.5">
              <span className="text-sm font-semibold">Left after this</span>
              <span className="numeric ml-auto text-[1.0625rem] font-extrabold">{dollars(balance - amount)}</span>
            </div>
          )}
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
            <Button variant="ghost" className="h-12" onClick={startOver}>
              Send another payment
            </Button>
          </>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6.5 text-center">
          <Stamp />
          <div className="flex flex-col gap-2">
            <h1 className="display text-[2.5rem]">Sent</h1>
            <p className="text-lg text-muted">
              <span className="numeric font-bold text-ink">{dollars(amount)}</span> to {recipient.label}
            </p>
          </div>
          <a
            className="pressable flex h-10 items-center gap-2 rounded-full border-[1.5px] border-ink bg-card px-4 text-sm font-semibold"
            href={`${explorer}/tx/${result.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            <Receipt className="h-4 w-4" />
            View receipt
            <External className="h-3.5 w-3.5 text-muted" />
          </a>
        </div>
      </Screen>
    );
  }

  if (result.status === "reverted") {
    return (
      <Outcome
        tone="danger"
        title="That payment didn't go through"
        footer={
          <>
            <Button onClick={() => setStep({ name: "review", recipient, amount })}>Try again</Button>
            <LinkButton href="/" variant="ghost" className="h-12">
              Back to my account
            </LinkButton>
          </>
        }
      >
        <p className="text-[1.0625rem] leading-[1.45] text-muted">
          Nothing left your balance. You still have{" "}
          <span className="numeric font-bold text-ink">{balance === null ? "your money" : dollars(balance)}</span>.
        </p>
        <a className="text-sm text-muted" href={`${explorer}/tx/${result.transactionHash}`} target="_blank" rel="noreferrer">
          See what happened
        </a>
      </Outcome>
    );
  }

  return (
    <Outcome
      tone="warn"
      title="We couldn't confirm this"
      footer={
        <>
          <LinkButton href="/activity">Check my activity</LinkButton>
          <LinkButton href="/" variant="ghost" className="h-12">
            Back to my account
          </LinkButton>
        </>
      }
    >
      <p className="text-[1.0625rem] leading-[1.45] text-muted">
        The payment was sent but the network never confirmed it, so we don&apos;t know whether it landed.
      </p>
      {/* No retry anywhere on this screen: sending again could pay twice. */}
      <Callout tone="info">
        Check your activity and balance before sending again — otherwise you could pay {recipient.label} twice.
      </Callout>
    </Outcome>
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

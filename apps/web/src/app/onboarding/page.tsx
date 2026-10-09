"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { isAddressEqual, type Address, type Hex } from "viem";
import { Avatar } from "@/components/Avatar";
import { CodeInput } from "@/components/CodeInput";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Bolt, Face, Shield } from "@/components/icons";
import {
  Button,
  Callout,
  Chip,
  ErrorText,
  LinkButton,
  Screen,
  ScreenSkeleton,
  Stamp,
  StepProgress,
  TextField,
} from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { ONBOARDING_MODE } from "@/config/onboarding";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";
import { isValidHandle, normalizeHandle } from "@/lib/handle";
import { recordRegistration } from "@/lib/identity-client";
import { safeNext } from "@/lib/routing";
import { GasFundsError, registerIdentity } from "@/lib/userop";
import { loginWithPasskey, registerPasskey } from "@/lib/wallet";

/**
 * Getting set up, in as few decisions as possible. Two rules hold the flow
 * together:
 *  - every step knows the step before it, so the back arrow and any "go back"
 *    button on screen always agree;
 *  - whatever the user was trying to reach travels along as `next`, so someone
 *    who opened a payment link and had to sign up first still lands on it.
 */
type Step =
  | { name: "phone" }
  | { name: "code"; challengeId: string; devCode?: string }
  /** The number already has an account: sign in with its passkey. */
  | { name: "sign-in"; account: Address; handle: string }
  | { name: "handle" }
  /** What a passkey is, before the operating system asks for one. */
  | { name: "passkey" }
  | { name: "creating"; stage: Stage }
  /** `pending`: the account is ready but the handle is not registered yet (no fee money). */
  | { name: "done"; handle: string; pending?: boolean };

/** How far the account creation has got, for the checklist on screen. */
type Stage = "passkey" | "account" | "finishing";

type Verified = { status: "new" } | { status: "registered"; account: Address; handle: string };
type Attestation = { phoneHash: Hex; handle: string; deadline: number; signature: Hex };

const phoneMode = ONBOARDING_MODE === "phone";
const RESEND_SECONDS = 30;

/** Position in the progress dots, and the step to go back to. */
const flow: Record<string, { at: number; back?: Step["name"] }> = phoneMode
  ? {
      phone: { at: 1 },
      code: { at: 2, back: "phone" },
      "sign-in": { at: 2, back: "phone" },
      handle: { at: 3, back: "phone" },
      passkey: { at: 4, back: "handle" },
    }
  : {
      handle: { at: 1 },
      passkey: { at: 2, back: "handle" },
    };

const STEPS = phoneMode ? 4 : 2;

/** One onboarding question: a heading, a line of context, and the body. */
function Ask({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="ask text-3xl">{title}</h1>
        {lede && <p className="text-base leading-[1.45] text-muted">{lede}</p>}
      </div>
      {children}
    </div>
  );
}

/** Three handle ideas when the one they wanted is gone. */
function suggest(handle: string): string[] {
  const stem = handle.slice(0, 17);
  return [`${stem}1`, `${stem}_`, `real${stem}`.slice(0, 20)].filter((option) => isValidHandle(option) && option !== handle);
}

function Onboarding() {
  const wallet = useWallet();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next")) ?? "/";

  const [step, setStep] = useState<Step>(phoneMode ? { name: "phone" } : { name: "handle" });
  const [phone, setPhone] = useState("+234");
  const [code, setCode] = useState("");
  const [handle, setHandle] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const cleanHandle = normalizeHandle(handle);
  // Someone who is already set up has no business here — unless they have just
  // finished, in which case the success screen is the point.
  const registered = wallet.status === "ready" && wallet.handle;
  const leaving = registered && step.name !== "done" && step.name !== "creating";

  useEffect(() => {
    if (leaving) router.replace(next);
  }, [leaving, next, router]);

  // Check the handle as it is typed, after a short pause.
  useEffect(() => {
    if (step.name !== "handle" || !isValidHandle(cleanHandle)) return;
    let current = true;
    const timer = setTimeout(() => {
      api.get<{ available: boolean }>(`/api/handles/${cleanHandle}`).then(
        (result) => current && setAvailable(result.available),
        (caught: unknown) => current && setError(errorText(caught)),
      );
    }, 350);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [step.name, cleanHandle]);

  // Count down to the next resend, so the button is honest about being disabled.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const submit = (task: () => Promise<void>) => (event: FormEvent) => {
    event.preventDefault();
    void task();
  };

  const sendCode = () =>
    run(async () => {
      const started = await api.post<{ challengeId: string; devCode?: string }>("/api/otp/start", { phone });
      setCode("");
      setResendIn(RESEND_SECONDS);
      setStep({ name: "code", ...started });
    });

  const verifyCode = (challengeId: string) =>
    run(async () => {
      const result = await api.post<Verified>("/api/otp/verify", { challengeId, code });
      setStep(result.status === "registered" ? { name: "sign-in", account: result.account, handle: result.handle } : { name: "handle" });
    });

  const signIn = (expected: Address) =>
    run(async () => {
      const credential = await loginWithPasskey();
      const account = await wallet.signIn(credential);
      if (!isAddressEqual(account.address, expected)) {
        await wallet.signOut();
        throw new Error("That passkey belongs to a different account. Use the one you created for this number.");
      }
      router.replace(next);
    });

  const createAccount = async () => {
    setError(null);
    try {
      // Reuse a passkey made on an earlier, unfinished attempt rather than creating a second one.
      setStep({ name: "creating", stage: "passkey" });
      // Circle needs a unique passkey name; the suffix keeps a retry of the same handle from clashing.
      const passkeyName = `${cleanHandle}.${crypto.randomUUID().slice(0, 4)}`;
      const account = wallet.status === "ready" ? wallet.account : await wallet.signIn(await registerPasskey(passkeyName));

      setStep({ name: "creating", stage: "account" });
      const attestation = await api.post<Attestation>("/api/identity/attest", { account: account.address, handle: cleanHandle });
      let result;
      try {
        result = await registerIdentity(account, attestation);
      } catch (caught) {
        // Free network fees are paused and a new account has nothing to pay the
        // fee with. The account itself needs no transaction, so it is ready:
        // keep the handle to claim from the home screen once money arrives.
        if (!(caught instanceof GasFundsError)) throw caught;
        wallet.setPendingHandle(cleanHandle);
        setStep({ name: "done", handle: cleanHandle, pending: true });
        return;
      }
      if (result.status !== "confirmed") {
        throw new Error(
          result.status === "reverted"
            ? "The registration was rejected. The handle may have just been taken; try another."
            : "The registration was submitted but not confirmed. Wait a moment and try again.",
        );
      }

      setStep({ name: "creating", stage: "finishing" });
      await recordRegistration(account.address);
      await wallet.refreshHandle();
      // Not straight to `next`: a brand-new account has nothing in it, and the
      // one thing it needs is a way to get funded.
      setStep({ name: "done", handle: cleanHandle });
    } catch (caught) {
      setError(errorText(caught));
      setAvailable(null);
      // Back to the passkey step, not all the way to the handle: a cancelled
      // prompt is one tap from being retried, and the handle is still theirs.
      setStep({ name: "passkey" });
    }
  };

  if (leaving) return <ScreenSkeleton />;

  /* -------------------------------------------------------------- app bar */

  const position = flow[step.name];
  const goBack =
    position === undefined
      ? undefined
      : position.back === undefined
        ? "/"
        : () => {
            setError(null);
            setStep({ name: position.back } as Step);
          };

  const bar = {
    back: goBack,
    lead: position ? <StepProgress step={position.at} of={STEPS} /> : undefined,
  };

  /* ---------------------------------------------------------------- steps */

  if (step.name === "phone") {
    return (
      <Screen
        {...bar}
        footer={
          <Button loading={busy} disabled={phone.replace(/\D/g, "").length < 8} form="phone-form">
            Send me a code
          </Button>
        }
      >
        <form id="phone-form" className="flex flex-1 flex-col gap-5" onSubmit={submit(sendCode)}>
          <Ask title="What's your number?" lede="Friends can pay you with it, and it is how you get back in on a new phone.">
            <TextField
              label="Phone number, with country code"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              hint="We'll text you a 6-digit code."
            />
            <ErrorText>{error}</ErrorText>
          </Ask>
        </form>
      </Screen>
    );
  }

  if (step.name === "code") {
    const { challengeId, devCode } = step;
    return (
      <Screen
        {...bar}
        footer={
          <>
            <Button loading={busy} disabled={code.length !== 6} form="code-form">
              Continue
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="numeric h-10"
              disabled={busy || resendIn > 0}
              onClick={sendCode}
            >
              {resendIn > 0 ? `Send a new code in ${resendIn}s` : "Send a new code"}
            </Button>
          </>
        }
      >
        <form id="code-form" className="flex flex-1 flex-col gap-5" onSubmit={submit(() => verifyCode(challengeId))}>
          <Ask title="Enter your code" lede={`We texted a 6-digit code to ${phone}.`}>
            <CodeInput value={code} onChange={setCode} autoFocus />
            {devCode && (
              <Callout>
                Development mode: no SMS was sent. Your code is{" "}
                <strong className="numeric">{devCode}</strong>.
              </Callout>
            )}
            <ErrorText>{error}</ErrorText>
          </Ask>
        </form>
      </Screen>
    );
  }

  if (step.name === "sign-in") {
    const { account } = step;
    return (
      <Screen
        {...bar}
        footer={
          <Button loading={busy} onClick={() => signIn(account)}>
            {busy ? "Waiting for your passkey…" : "Sign in with passkey"}
          </Button>
        }
      >
        <div className="flex flex-1 flex-col justify-center gap-5.5">
          <Avatar seed={step.handle} size="xl" ring />
          <div className="flex flex-col gap-2.5">
            <h1 className="ask text-3xl">Welcome back, @{step.handle}</h1>
            <p className="text-[1.0625rem] leading-[1.45] text-muted">
              This number already has an account. Use its passkey to sign in on this device.
            </p>
          </div>
          <ErrorText>{error}</ErrorText>
        </div>
      </Screen>
    );
  }

  if (step.name === "passkey") {
    return (
      <Screen
        {...bar}
        footer={
          <>
            <Button onClick={createAccount}>Create my account</Button>
            <p className="px-2 pb-1 text-center text-xs leading-[1.4] text-muted">
              Your phone will ask to save a passkey for CrackPay. Approve it to finish.
            </p>
          </>
        }
      >
        <Ask
          title="One last thing"
          lede="CrackPay has no password and no seed phrase. Your phone's own lock screen approves everything."
        >
          <ul className="border-t-[1.5px] border-ink">
            {[
              { Icon: Face, title: "Your face, finger or PIN", body: "The same unlock you already use approves each payment." },
              { Icon: Shield, title: "Nothing to write down", body: "The key stays on your device and syncs with your phone account." },
              { Icon: Bolt, title: "Takes a few seconds", body: "We set up your account and your @handle in one go." },
            ].map(({ Icon, title, body }, index, all) => (
              <li
                key={title}
                className={`flex gap-3.5 py-4 ${index === all.length - 1 ? "border-b-[1.5px] border-ink" : "border-b border-hair"}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-[1.5px] border-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm leading-5 text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <ErrorText>{error}</ErrorText>
        </Ask>
      </Screen>
    );
  }

  if (step.name === "creating") {
    const stages: readonly { key: Stage; label: string }[] = [
      { key: "passkey", label: "Saving your passkey" },
      { key: "account", label: `Registering @${cleanHandle}` },
      { key: "finishing", label: "Finishing up" },
    ];
    const current = stages.findIndex((stage) => stage.key === step.stage);
    return (
      <Screen>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <h1 className="ask text-[1.75rem]">Setting up your account</h1>
          {/* Mono tags rather than spinners: progress stays legible without motion. */}
          <ul className="border-t-[1.5px] border-ink" aria-live="polite">
            {stages.map((stage, index) => (
              <li
                key={stage.key}
                className={`flex items-center gap-3.5 border-b border-hair py-4 ${index <= current ? "" : "opacity-40"}`}
              >
                <span className="label w-11 text-ink">
                  {index < current ? "Done" : index === current ? "Now" : "Next"}
                </span>
                <span className={`flex-1 ${index === current ? "font-bold" : ""}`}>{stage.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">Keep this screen open. It only takes a moment.</p>
        </div>
      </Screen>
    );
  }

  if (step.name === "done" && step.pending) {
    return (
      <Screen
        footer={
          <>
            <LinkButton href="/add-money">Add money</LinkButton>
            <LinkButton href="/" variant="ghost" className="h-12">
              Go to my account
            </LinkButton>
          </>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Stamp size="md" />
          <div className="flex flex-col gap-1.5">
            <h1 className="display text-[2.125rem]">Your account is ready</h1>
            <p className="text-lg text-muted">
              Add a little money to claim <span className="font-bold text-ink">@{step.handle}</span>. Free network fees
              are paused for now, so registering it costs about a cent.
            </p>
          </div>
        </div>
        <InstallPrompt />
      </Screen>
    );
  }

  if (step.name === "done") {
    return (
      <Screen
        footer={
          <>
            <LinkButton href={next}>{next === "/" ? "Go to my account" : "Continue"}</LinkButton>
            <LinkButton href="/receive" variant="ghost" className="h-12">
              Share my handle to get paid
            </LinkButton>
          </>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Stamp size="md" />
          <div className="flex flex-col gap-1.5">
            <h1 className="display text-[2.125rem]">You&apos;re all set</h1>
            <p className="text-lg text-muted">
              You can be paid at <span className="font-bold text-ink">@{step.handle}</span>
            </p>
          </div>
        </div>
        <InstallPrompt />
      </Screen>
    );
  }

  /* ------------------------------------------------------------ the handle */

  const valid = isValidHandle(cleanHandle);
  const status = !cleanHandle || !valid ? undefined : available === null ? undefined : available ? "ok" : "error";
  const hint = !cleanHandle
    ? "3–20 letters, numbers or underscores, starting with a letter."
    : !valid
      ? "Use 3–20 lowercase letters, numbers or underscores, starting with a letter."
      : available === null
        ? "Checking…"
        : available
          ? `@${cleanHandle} is yours.`
          : `@${cleanHandle} is taken.`;

  return (
    <Screen
      {...bar}
      footer={
        <Button disabled={!valid || !available} form="handle-form">
          Continue
        </Button>
      }
    >
      <form
        id="handle-form"
        className="flex flex-1 flex-col gap-5"
        onSubmit={submit(async () => setStep({ name: "passkey" }))}
      >
        <Ask title="Pick your handle" lede="This is how people find you and pay you. Choose carefully — it stays with you.">
          <TextField
            label="Your handle"
            prefix="@"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={21}
            autoFocus
            placeholder="sam"
            value={handle}
            onChange={(event) => {
              setHandle(event.target.value);
              setAvailable(null);
            }}
            status={status}
            hint={hint}
          />
          {valid && available === false && (
            <div className="flex flex-wrap gap-2">
              {suggest(cleanHandle).map((option) => (
                <Chip
                  key={option}
                  onClick={() => {
                    setHandle(option);
                    setAvailable(null);
                  }}
                >
                  @{option}
                </Chip>
              ))}
            </div>
          )}
          <ErrorText>{error}</ErrorText>
        </Ask>
      </form>
    </Screen>
  );
}

export default function OnboardingPage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Onboarding />
    </Suspense>
  );
}

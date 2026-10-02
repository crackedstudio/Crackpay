"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { isAddressEqual, type Address, type Hex } from "viem";
import { Button, ErrorText, Screen, TextField } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";
import { isValidHandle, normalizeHandle } from "@/lib/handle";
import { registerIdentity } from "@/lib/userop";
import { loginWithPasskey, registerPasskey } from "@/lib/wallet";

type Step =
  | { name: "phone" }
  | { name: "code"; challengeId: string; devCode?: string }
  /** The number already has an account: sign in with its passkey. */
  | { name: "sign-in"; account: Address; handle: string }
  | { name: "handle" }
  | { name: "creating"; message: string };

type Verified = { status: "new" } | { status: "registered"; account: Address; handle: string };
type Attestation = { phoneHash: Hex; handle: string; deadline: number; signature: Hex };

export default function Onboarding() {
  const wallet = useWallet();
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "phone" });
  const [phone, setPhone] = useState("+234");
  const [code, setCode] = useState("");
  const [handle, setHandle] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cleanHandle = normalizeHandle(handle);
  const registered = wallet.status === "ready" && wallet.handle;

  useEffect(() => {
    if (registered) router.replace("/");
  }, [registered, router]);

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
      router.replace("/");
    });

  const createAccount = async () => {
    setError(null);
    try {
      // Reuse a passkey made on an earlier, unfinished attempt rather than creating a second one.
      setStep({ name: "creating", message: "Creating your passkey…" });
      const account = wallet.status === "ready" ? wallet.account : await wallet.signIn(await registerPasskey(cleanHandle));

      setStep({ name: "creating", message: "Setting up your account…" });
      const attestation = await api.post<Attestation>("/api/identity/attest", { account: account.address, handle: cleanHandle });
      const result = await registerIdentity(account, attestation);
      if (result.status !== "confirmed") {
        throw new Error(
          result.status === "reverted"
            ? "The registration was rejected. The handle may have just been taken; try another."
            : "The registration was submitted but not confirmed. Wait a moment and try again.",
        );
      }

      await api.post("/api/identity/confirm");
      await wallet.refreshHandle();
      router.replace("/");
    } catch (caught) {
      setError(errorText(caught));
      setAvailable(null);
      setStep({ name: "handle" });
    }
  };

  if (step.name === "phone") {
    return (
      <Screen title="Your phone number" back="/">
        <form className="flex flex-1 flex-col gap-5" onSubmit={submit(sendCode)}>
          <TextField
            label="Phone number, with country code"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            hint="We'll text you a code. Friends can pay you with this number."
          />
          <ErrorText>{error}</ErrorText>
          <div className="mt-auto">
            <Button disabled={busy || phone.length < 8}>Send code</Button>
          </div>
        </form>
      </Screen>
    );
  }

  if (step.name === "code") {
    const { challengeId } = step;
    return (
      <Screen title="Enter the code" back="/">
        <form className="flex flex-1 flex-col gap-5" onSubmit={submit(() => verifyCode(challengeId))}>
          <TextField
            label={`6-digit code sent to ${phone}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          />
          {step.devCode && (
            <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">
              Development mode: no SMS was sent. Your code is{" "}
              <span className="font-mono font-semibold text-foreground">{step.devCode}</span>.
            </p>
          )}
          <ErrorText>{error}</ErrorText>
          <div className="mt-auto flex flex-col gap-2">
            <Button disabled={busy || code.length !== 6}>Continue</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={sendCode}>
              Send a new code
            </Button>
          </div>
        </form>
      </Screen>
    );
  }

  if (step.name === "sign-in") {
    const { account } = step;
    return (
      <Screen title={`Welcome back, @${step.handle}`} back="/">
        <p className="text-muted">Use the passkey you created for this account to sign in on this device.</p>
        <ErrorText>{error}</ErrorText>
        <div className="mt-auto">
          <Button disabled={busy} onClick={() => signIn(account)}>
            Sign in with passkey
          </Button>
        </div>
      </Screen>
    );
  }

  if (step.name === "creating") {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg font-medium">{step.message}</p>
          <p className="text-sm text-muted">This takes a few seconds.</p>
        </div>
      </Screen>
    );
  }

  const valid = isValidHandle(cleanHandle);
  const hint = !cleanHandle
    ? "3–20 letters, numbers or underscores, starting with a letter."
    : !valid
      ? "Use 3–20 lowercase letters, numbers or underscores, starting with a letter."
      : available === null
        ? "Checking…"
        : available
          ? `@${cleanHandle} is available.`
          : `@${cleanHandle} is taken.`;

  return (
    <Screen title="Pick a handle" back="/">
      <form className="flex flex-1 flex-col gap-5" onSubmit={submit(createAccount)}>
        <TextField
          label="Your handle"
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
          hint={hint}
        />
        <p className="text-sm text-muted">
          Next, your phone will ask to save a passkey. It replaces a password and a seed phrase: your face, fingerprint or
          screen lock approves every payment.
        </p>
        <ErrorText>{error}</ErrorText>
        <div className="mt-auto">
          <Button disabled={busy || !valid || !available}>Create my account</Button>
        </div>
      </form>
    </Screen>
  );
}

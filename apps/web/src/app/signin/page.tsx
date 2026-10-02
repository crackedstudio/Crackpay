"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Face } from "@/components/icons";
import { Button, ErrorText, LinkButton, Screen, ScreenSkeleton } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { errorText } from "@/lib/format";
import { safeNext, withNext } from "@/lib/routing";
import { loginWithPasskey } from "@/lib/wallet";

function SignIn() {
  const wallet = useWallet();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next")) ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Go straight where they were headed. A passkey with no registration behind it
  // goes back to onboarding instead, carrying the destination along — landing on
  // the welcome screen and bouncing from there showed two blank frames.
  const handle = wallet.status === "ready" ? wallet.handle : null;
  const ready = wallet.status === "ready";

  useEffect(() => {
    if (!ready) return;
    router.replace(handle ? next : withNext("/onboarding", next));
  }, [ready, handle, next, router]);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      await wallet.signIn(await loginWithPasskey());
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (wallet.status === "loading" || wallet.status === "ready") return <ScreenSkeleton />;

  return (
    <Screen
      back="/"
      footer={
        <>
          <Button loading={busy} onClick={signIn}>
            {busy ? "Waiting for your passkey…" : "Sign in with passkey"}
          </Button>
          <LinkButton href="/onboarding" variant="ghost">
            I&apos;m new here
          </LinkButton>
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Face className="h-8 w-8" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-muted">
            Unlock with the passkey you saved for CrackPay. Your face, fingerprint or screen lock is all it takes.
          </p>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    </Screen>
  );
}

export default function SignInPage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <SignIn />
    </Suspense>
  );
}

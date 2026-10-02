"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ErrorText, Screen } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { errorText } from "@/lib/format";
import { loginWithPasskey } from "@/lib/wallet";

export default function SignIn() {
  const wallet = useWallet();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The start page takes it from here: home, or back to pick a handle if none is registered.
  useEffect(() => {
    if (wallet.status === "ready") router.replace("/");
  }, [wallet.status, router]);

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

  return (
    <Screen title="Welcome back" back="/">
      <p className="text-muted">Use the passkey you created for your CrackPay account to sign in on this device.</p>
      <ErrorText>{error}</ErrorText>
      <div className="mt-auto">
        <Button disabled={busy} onClick={signIn}>
          {busy ? "Waiting for passkey…" : "Sign in with passkey"}
        </Button>
      </div>
    </Screen>
  );
}

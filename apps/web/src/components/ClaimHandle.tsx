"use client";

import { useState } from "react";
import type { Hex } from "viem";
import { ApiClientError, api } from "@/lib/api";
import { errorText } from "@/lib/format";
import { recordRegistration } from "@/lib/identity-client";
import { GasFundsError, registerIdentity } from "@/lib/userop";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import { Button, Callout, LinkButton } from "./ui";
import { useWallet } from "./WalletProvider";

type Attestation = { phoneHash: Hex; handle: string; deadline: number; signature: Hex };

/**
 * For an account whose handle was chosen at sign-up but never registered,
 * because free network fees were paused and the account had nothing to pay
 * the fee with. Claiming tries Circle's sponsorship first, so it is free again
 * the moment Circle is back; until then the account pays about a cent.
 */
export function ClaimHandle({ account, handle, balance }: { account: CrackPaySmartAccount; handle: string; balance: bigint | null }) {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      const attestation = await api.post<Attestation>("/api/identity/attest", { account: account.address, handle });
      const result = await registerIdentity(account, attestation);
      if (result.status !== "confirmed") {
        throw new Error(
          result.status === "reverted"
            ? `@${handle} could not be registered. It may have just been taken.`
            : "The registration was submitted but not confirmed. Wait a moment and try again.",
        );
      }
      await recordRegistration(account.address);
      await wallet.refreshHandle();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === "handle_taken") setTaken(true);
      setError(caught instanceof GasFundsError ? "Add a little money first to pay the fee, then claim it." : errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const empty = balance === 0n;
  return (
    <div className="flex flex-col gap-3 rounded-lg border-[1.5px] border-dashed border-ink p-4.5">
      <div className="flex flex-col gap-1">
        <p className="text-[1.0625rem] font-bold">Claim @{handle}</p>
        <p className="text-sm leading-5 text-muted">
          {empty
            ? "Your account works already. Add a little money, then claim your handle so people can pay you by name. Free network fees are paused for now, so it costs about a cent."
            : "Register your handle so people can pay you by name. Free network fees are paused for now, so it costs about a cent."}
        </p>
      </div>
      <Callout tone="error">{error}</Callout>
      {taken ? (
        <LinkButton href="/onboarding" size="md" variant="secondary">
          Choose another handle
        </LinkButton>
      ) : empty ? (
        <LinkButton href="/add-money" size="md" variant="secondary">
          Deposit
        </LinkButton>
      ) : (
        <Button size="md" loading={busy} onClick={claim}>
          Claim @{handle}
        </Button>
      )}
    </div>
  );
}

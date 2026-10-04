"use client";

import { useState, type FormEvent } from "react";
import { CopyRow } from "@/components/CopyRow";
import { PayTicket, payLink } from "@/components/PayTicket";
import { RequireAccount } from "@/components/RequireAccount";
import { ChevronRight, External, Link as LinkIcon, Share, Wallet } from "@/components/icons";
import { Button, Card, ErrorText, Label, ListRow, Screen, TextField } from "@/components/ui";
import { arcChain } from "@/lib/arc";
import { shortAddress } from "@/lib/format";
import { KASHLINK_APP_ID, kashLinkAppUrl, kashLinkProblem, parseKashLink } from "@/lib/kashlink";
import { useMiniApp } from "@/lib/miniapp/use-miniapps";
import type { CrackPaySmartAccount } from "@/lib/wallet";

const FAUCET_URL = "https://faucet.circle.com";

/** Paste a KashLink someone sent you, and claim it into this account inside CrackPay. */
function OpenKashLink() {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(event: FormEvent) {
    event.preventDefault();
    const parsed = parseKashLink(link);
    if (!parsed.ok) return setError(kashLinkProblem(parsed.reason));
    // A full page load into KashLink, which claims to this account. The link's key
    // travels only in the URL fragment, which never reaches a server.
    window.location.assign(kashLinkAppUrl(parsed.fragment));
  }

  return (
    <form onSubmit={open} className="flex flex-col gap-3 px-4 pb-4">
      <TextField
        label="Paste the KashLink you were sent"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://testnet.kashlink.live/#…"
        value={link}
        status={error ? "error" : undefined}
        onChange={(event) => {
          setLink(event.target.value);
          setError(null);
        }}
      />
      <ErrorText>{error}</ErrorText>
      <Button size="md" disabled={!link.trim()}>
        Open and claim
      </Button>
    </form>
  );
}

function AddMoney({ account, handle }: { account: CrackPaySmartAccount; handle: string }) {
  const kashlink = useMiniApp(KASHLINK_APP_ID);
  const [claiming, setClaiming] = useState(false);

  return (
    <Screen title="Deposit" back="/">
      <p className="text-muted">Dollars arrive in your account in about a second, with no fees.</p>

      {/* Being paid in person is the quickest deposit, so the code comes first. */}
      <section className="flex flex-col gap-3">
        <Label>From someone on CrackPay</Label>
        <PayTicket handle={handle} link={payLink(handle)} />
        <p className="text-center text-sm text-muted">Scan with any phone camera to pay @{handle}</p>
        <Card>
          <ListRow
            label={<span className="text-base font-bold text-foreground">Share my payment link</span>}
            value={<span className="text-sm font-normal text-muted">Or copy your handle and link.</span>}
            icon={<Share className="h-5 w-5" />}
            href="/receive"
            trailing={<ChevronRight className="h-5 w-5 text-muted" />}
          />
        </Card>
      </section>

      {kashlink.status === "ready" && (
        <section className="flex flex-col gap-2">
          <Label>With a KashLink</Label>
          <Card>
            {claiming ? (
              <>
                <ListRow
                  label={<span className="text-base font-bold text-foreground">Claim a KashLink</span>}
                  value={<span className="text-sm font-normal text-muted">The money goes straight into this account.</span>}
                  icon={<LinkIcon className="h-5 w-5" />}
                />
                <OpenKashLink />
              </>
            ) : (
              <ListRow
                label={<span className="text-base font-bold text-foreground">Claim a KashLink</span>}
                value={<span className="text-sm font-normal text-muted">Someone sent you money as a link? Open it here.</span>}
                icon={<LinkIcon className="h-5 w-5" />}
                onClick={() => setClaiming(true)}
                trailing={<ChevronRight className="h-5 w-5 text-muted" />}
              />
            )}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <Label>From another wallet or exchange</Label>
        <Card className="divide-y divide-hair">
          <CopyRow
            label="Your account address"
            value={account.address}
            display={shortAddress(account.address)}
            icon={<Wallet className="h-5 w-5" />}
          />
        </Card>
        <p className="px-1 text-sm text-muted">
          Send only USDC on the Arc network ({arcChain.name}) to this address. Anything else may be lost.
        </p>
      </section>

      {arcChain.testnet && (
        <section className="flex flex-col gap-2">
          <Label>Test dollars</Label>
          <Card>
            <ListRow
              label={<span className="text-base font-bold text-foreground">Get free test USDC</span>}
              value={
                <span className="text-sm font-normal text-muted">
                  From Circle&apos;s faucet. Choose Arc Testnet and paste your account address.
                </span>
              }
              icon={<External className="h-5 w-5" />}
              href={FAUCET_URL}
            />
          </Card>
        </section>
      )}
    </Screen>
  );
}

export default function AddMoneyPage() {
  return <RequireAccount>{(account, handle) => <AddMoney account={account} handle={handle} />}</RequireAccount>;
}

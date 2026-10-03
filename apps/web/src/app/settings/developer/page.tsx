"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { RequireAccount } from "@/components/RequireAccount";
import { Sheet } from "@/components/Sheet";
import { ChevronRight, Info, Link as LinkIcon, X } from "@/components/icons";
import { Button, Callout, Card, ListRow, Screen, SwitchRow, TextField } from "@/components/ui";
import { ONBOARDING_MODE } from "@/config/onboarding";
import { testMiniApp, testUrlProblem } from "@/config/miniapps";
import { arcChain } from "@/lib/arc";
import { developer } from "@/lib/developer";
import { shortAddress } from "@/lib/format";
import { PROTOCOL_VERSION } from "@/lib/miniapp/sdk";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import packageInfo from "../../../../package.json";

const subscribe = () => () => {};

/** A stored setting, read after hydration and updated locally when changed. */
function useStoredFlag(read: () => boolean, write: (value: boolean) => void): [boolean, (value: boolean) => void] {
  const stored = useSyncExternalStore(subscribe, read, () => false);
  const [override, setOverride] = useState<boolean | null>(null);
  return [
    override ?? stored,
    (value) => {
      write(value);
      setOverride(value);
    },
  ];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

/** Opens a URL as a test app. A full page load, because the test route has its own frame policy. */
function openTestApp(url: string) {
  developer.rememberUrl(url);
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/apps/test?url=${encodeURIComponent(url)}`);
}

function OpenUrlSheet({ onClose }: { onClose: () => void }) {
  const [recent, setRecent] = useState(developer.recentUrls);
  const [url, setUrl] = useState(recent[0] ?? "");
  const [error, setError] = useState<string | null>(null);

  function load(event: FormEvent) {
    event.preventDefault();
    const app = testMiniApp(url);
    if (!app) return setError(testUrlProblem(url) ?? "That address can't be loaded.");
    openTestApp(app.url);
  }

  return (
    <Sheet title="Open URL" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={load}>
        <TextField
          label="Mini App URL"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          placeholder="https://your-app.example.com"
          value={url}
          status={error ? "error" : undefined}
          hint={error ?? "A deployment, your own domain, or an ngrok tunnel. Must be https://."}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
        />
        <Button disabled={!url.trim()}>Load</Button>
      </form>

      {recent.length > 0 && (
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Recent</span>
            <button
              type="button"
              className="text-sm text-muted"
              onClick={() => {
                developer.clearRecentUrls();
                setRecent([]);
              }}
            >
              Clear
            </button>
          </div>
          <Card className="divide-y divide-line">
            {recent.map((entry) => (
              <ListRow
                key={entry}
                layout="inline"
                label={<span className="truncate text-foreground">{entry.replace(/^https?:\/\//, "")}</span>}
                trailing={<ChevronRight className="h-5 w-5 text-muted" />}
                onClick={() => openTestApp(entry)}
              />
            ))}
          </Card>
        </div>
      )}
    </Sheet>
  );
}

function EnvironmentSheet({ account, onClose }: { account: CrackPaySmartAccount; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Network", arcChain.name],
    ["Chain ID", `${arcChain.id} (0x${arcChain.id.toString(16)})`],
    ["RPC", arcChain.rpcUrls.default.http[0] ?? ""],
    ["Explorer", arcChain.blockExplorers.default.url],
    ["Account", shortAddress(account.address)],
    ["Sign-up", ONBOARDING_MODE === "passkey" ? "Passkey only" : "Phone number"],
    ["CrackPay version", packageInfo.version],
    ["Mini App protocol", `v${PROTOCOL_VERSION}`],
    ["CrackPay origin", window.location.origin],
  ];
  return (
    <Sheet title="Wallet environment" onClose={onClose}>
      <Card className="divide-y divide-line">
        {rows.map(([label, value]) => (
          <ListRow key={label} layout="inline" label={label} value={<span className="numeric text-sm">{value}</span>} />
        ))}
      </Card>
      <p className="pb-2 text-sm text-muted">
        Mini Apps built with <span className="font-medium text-foreground">@crackpay/miniapp-sdk</span> trust this origin
        only if it is in the SDK&apos;s host list.
      </p>
    </Sheet>
  );
}

function DeveloperSettings({ account }: { account: CrackPaySmartAccount }) {
  const [enabled, setEnabled] = useStoredFlag(developer.isEnabled, developer.setEnabled);
  const [logging, setLogging] = useStoredFlag(developer.isLoggingMessages, developer.setLoggingMessages);
  const [sheet, setSheet] = useState<"open" | "environment" | null>(null);

  return (
    <>
      <Screen title="Developer settings" back="/settings">
        <Section title="Load Mini App">
          <Card>
            {enabled ? (
              <ListRow
                layout="inline"
                label={<span className="text-base font-medium text-foreground">Open URL…</span>}
                icon={<LinkIcon className="h-5 w-5" />}
                trailing={<ChevronRight className="h-5 w-5 text-muted" />}
                onClick={() => setSheet("open")}
              />
            ) : (
              <ListRow
                label="Open URL…"
                value={<span className="text-sm font-normal text-muted">Turn on Developer mode first</span>}
                icon={<LinkIcon className="h-5 w-5" />}
              />
            )}
          </Card>
        </Section>

        <Card>
          <SwitchRow
            label="Developer mode"
            description="Load your own Mini App before it is reviewed and listed."
            checked={enabled}
            onChange={setEnabled}
          />
        </Card>

        <Card>
          <SwitchRow
            label="Use test net"
            description={`CrackPay runs on ${arcChain.name}. Arc Mainnet is not live in CrackPay yet.`}
            checked
            disabled
          />
        </Card>

        <Section title="Debugging">
          <Card className="divide-y divide-line">
            <SwitchRow
              label="Log Mini App messages"
              description="Every request a Mini App makes, and the answer, in the browser console."
              checked={logging}
              onChange={setLogging}
            />
            <ListRow
              layout="inline"
              label={<span className="text-base font-medium text-foreground">Wallet environment</span>}
              icon={<Info className="h-5 w-5" />}
              trailing={<ChevronRight className="h-5 w-5 text-muted" />}
              onClick={() => setSheet("environment")}
            />
          </Card>
        </Section>

        <Callout tone="info">
          Test apps are not reviewed by CrackPay and can ask you to approve calls to any contract. Only load apps you are
          building yourself. Developer docs:{" "}
          <a className="font-medium underline" href="/developers">
            crackpay.vercel.app/developers
          </a>
        </Callout>

        {enabled && (
          <button
            type="button"
            onClick={() => setEnabled(false)}
            className="flex items-center justify-center gap-2 text-sm text-muted"
          >
            <X className="h-4 w-4" />
            Turn off Developer mode
          </button>
        )}
      </Screen>

      {sheet === "open" && <OpenUrlSheet onClose={() => setSheet(null)} />}
      {sheet === "environment" && <EnvironmentSheet account={account} onClose={() => setSheet(null)} />}
    </>
  );
}

export default function DeveloperSettingsPage() {
  return <RequireAccount>{(account) => <DeveloperSettings account={account} />}</RequireAccount>;
}

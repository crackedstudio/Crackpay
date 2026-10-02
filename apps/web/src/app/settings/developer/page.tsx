"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { RequireAccount } from "@/components/RequireAccount";
import { Button, ErrorText, Screen, TextField } from "@/components/ui";
import { testMiniApp } from "@/config/miniapps";
import { arcChain } from "@/lib/arc";
import { developer } from "@/lib/developer";

const subscribe = () => () => {};

function DeveloperSettings() {
  const stored = useSyncExternalStore(subscribe, developer.isEnabled, () => false);
  const [override, setOverride] = useState<boolean | null>(null);
  const [url, setUrl] = useState(() => (typeof window === "undefined" ? "" : developer.lastUrl()));
  const [error, setError] = useState<string | null>(null);
  const enabled = override ?? stored;

  function toggle() {
    developer.setEnabled(!enabled);
    setOverride(!enabled);
  }

  function load(event: FormEvent) {
    event.preventDefault();
    const app = testMiniApp(url);
    if (!app) {
      setError("Enter an HTTPS URL, or http://localhost:<port> while you develop.");
      return;
    }
    developer.setLastUrl(app.url);
    // A full page load: the test route is served with a frame policy that allows any
    // HTTPS site, and a client-side navigation would keep this page's stricter one.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/apps/test?url=${encodeURIComponent(app.url)}`);
  }

  return (
    <Screen title="Developer settings" back="/settings">
      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card px-4">
        <button onClick={toggle} role="switch" aria-checked={enabled} className="flex items-center justify-between gap-3 py-3 text-left">
          <span className="flex flex-col">
            <span className="font-medium">Developer mode</span>
            <span className="text-sm text-muted">Load your own Mini App before it is listed.</span>
          </span>
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm ${enabled ? "bg-accent text-accent-foreground" : "border border-line text-muted"}`}>
            {enabled ? "On" : "Off"}
          </span>
        </button>
        <div className="flex justify-between py-3 text-sm">
          <span className="text-muted">Network</span>
          <span>
            {arcChain.name} ({arcChain.id})
          </span>
        </div>
      </div>

      {enabled && (
        <form className="flex flex-col gap-4" onSubmit={load}>
          <TextField
            label="Load test page"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://your-app.example.com"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            hint="For a local dev server, use a tunnel such as ngrok and paste its HTTPS URL."
          />
          <ErrorText>{error}</ErrorText>
          <Button disabled={!url.trim()}>Load</Button>
          <p className="text-sm text-muted">
            Test apps are not reviewed by CrackPay and can ask you to approve calls to any contract. Only load apps you are
            building yourself.
          </p>
        </form>
      )}
    </Screen>
  );
}

export default function DeveloperSettingsPage() {
  return <RequireAccount>{() => <DeveloperSettings />}</RequireAccount>;
}

"use client";

// Phase 0 spike — delete once install and Web Push are proven.
import { useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === "object" && body !== null && "error" in body ? String(body.error) : "";
  return message || `Request failed with ${response.status}`;
}

export default function PwaSpike() {
  const [status, setStatus] = useState("Not subscribed.");
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<string>) {
    setBusy(true);
    try {
      setStatus(await task());
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    } finally {
      setBusy(false);
    }
  }

  const subscribe = () =>
    run(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Web Push is not supported in this browser");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error(`Notification permission: ${permission}`);

      const keyResponse = await fetch("/spike/pwa/push");
      if (!keyResponse.ok) throw new Error(await readError(keyResponse));
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      });
      return `Subscribed: ${new URL(subscription.endpoint).hostname}`;
    });

  const sendTest = () =>
    run(async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("Subscribe first");

      const response = await fetch("/spike/pwa/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!response.ok) throw new Error(await readError(response));
      return "Push accepted by the push service. A notification should arrive.";
    });

  const button = "w-full rounded bg-foreground px-3 py-2 text-background disabled:opacity-40";

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-col gap-4 p-4 text-sm">
      <h1 className="text-lg font-semibold">Spike: PWA install + Web Push</h1>
      <InstallPrompt />
      <button className={button} disabled={busy} onClick={subscribe}>
        Subscribe to push
      </button>
      <button className={button} disabled={busy} onClick={sendTest}>
        Send test push
      </button>
      <p className="break-words">{status}</p>
    </main>
  );
}

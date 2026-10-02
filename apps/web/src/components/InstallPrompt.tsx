"use client";

import { useEffect, useState } from "react";

// Chromium-only event; not in the DOM lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "unknown" | "installed" | "ios" | "other";

function detectPlatform(): Platform {
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  return "other";
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Browser-only checks, so they have to run after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectPlatform());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setPlatform("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (platform === "unknown" || platform === "installed") return null;

  if (platform === "ios") {
    return (
      <p className="text-sm">
        To install CrackPay, tap the Share button, then &ldquo;Add to Home Screen&rdquo;.
      </p>
    );
  }

  if (!deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <button
      className="w-full rounded bg-foreground px-3 py-2 text-sm text-background"
      onClick={install}
    >
      Add CrackPay to your home screen
    </button>
  );
}

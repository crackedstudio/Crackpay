"use client";

import { useEffect, useState } from "react";
import { Share, X } from "./icons";
import { Button, IconButton } from "./ui";

// Chromium-only event; not in the DOM lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "unknown" | "installed" | "ios" | "other";

// Asking once is a suggestion; asking every visit is nagging.
const DISMISSED_KEY = "crackpay.install-dismissed";

function detectPlatform(): Platform {
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  return "other";
}

/**
 * The nudge to install. Appears as a card the user can dismiss for good, and
 * only where it is relevant: not inside a flow, and never once installed.
 */
export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Browser-only checks, so they have to run after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectPlatform());
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");

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

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch (error) {
      console.error("Could not remember the dismissal", error);
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (platform === "unknown" || platform === "installed" || dismissed) return null;
  if (platform === "other" && !deferred) return null;

  return (
    <div className="relative flex animate-fade flex-col gap-3 rounded-lg border-[1.5px] border-dashed border-ink p-4">
      <IconButton label="Dismiss" onClick={dismiss} className="absolute right-1 top-1 h-9 w-9 text-muted">
        <X className="h-4 w-4" />
      </IconButton>
      <div className="flex flex-col gap-1 pr-8">
        <p className="font-bold">Keep CrackPay on your home screen</p>
        <p className="text-sm leading-5 text-muted">
          {platform === "ios"
            ? "Tap Share, then “Add to Home Screen”. It opens full screen, like an app."
            : "It opens full screen, works offline and loads instantly."}
        </p>
      </div>
      {platform === "ios" ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Share className="h-5 w-5" />
          Share → Add to Home Screen
        </p>
      ) : (
        <Button size="md" variant="secondary" onClick={install}>
          Add to home screen
        </Button>
      )}
    </div>
  );
}

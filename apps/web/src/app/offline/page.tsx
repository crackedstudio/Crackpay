"use client";

import { Button, Screen } from "@/components/ui";

/**
 * The service worker's fallback. The missing balance is drawn as a ghosted
 * figure rather than an icon, because the question being answered is "where is
 * my money" — and the answer leads.
 */
export default function Offline() {
  return (
    <Screen
      footer={
        /* The service worker answers the failed navigation with this page but
           leaves the URL alone, so reloading retries the screen they wanted —
           not this one, and not the home screen. */
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Try again
        </Button>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-5.5">
        <span aria-hidden className="display text-[4.5rem] leading-[0.9] text-hair">
          —/—
        </span>
        <h1 className="ask text-3xl font-extrabold">You&apos;re offline</h1>
        <p className="text-[1.0625rem] leading-[1.45] text-muted">
          Your money is safe. CrackPay needs a connection to show your balance and send a payment.
        </p>
      </div>
    </Screen>
  );
}

"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Only production builds get the service worker. In development it would
    // outlive the dev server and answer for anything else later run on the same
    // localhost port with CrackPay's offline page. Remove any left from before.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch((error: unknown) => console.error("Could not remove the development service worker", error));
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });
  }, []);

  return null;
}

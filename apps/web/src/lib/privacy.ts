"use client";

import { useSyncExternalStore } from "react";

// Hide amounts: a per-device preference for using the app where others can see
// the screen. It only changes what is drawn; nothing about the account changes,
// and it never leaves the device.

const KEY = "crackpay.hideAmounts";
const EVENT = "crackpay:hide-amounts";

/** What a hidden amount shows instead of its figure. */
export const HIDDEN_AMOUNT = "$••••";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  // The custom event keeps every mounted screen in step in this tab; "storage"
  // does the same for other tabs.
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setAmountsHidden(hidden: boolean): void {
  try {
    if (hidden) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch (error) {
    console.error("Could not save the hide-amounts setting", error);
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Whether amounts are hidden on this device. False during server render. */
export function useAmountsHidden(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

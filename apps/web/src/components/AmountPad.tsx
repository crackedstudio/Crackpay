"use client";

import { useEffect } from "react";
import { AMOUNT_KEYS, isAmountKey, pressAmountKey } from "@/lib/amount-input";
import { Backspace } from "./icons";

/**
 * Entering an amount is the one thing this app exists to do, so it gets a
 * purpose-built screen rather than a text field: a figure large enough to read
 * at arm's length and a keypad under the thumb. The value stays a decimal string
 * here — `parseAmount` turns it into base units once, at the edge of the flow.
 */

/** Shrinks the figure as it grows, so it never wraps or clips. */
function sizeFor(length: number): string {
  if (length <= 6) return "text-[4rem]";
  if (length <= 9) return "text-5xl";
  return "text-4xl";
}

export function AmountPad({
  value,
  onChange,
  caption,
  problem,
  chips,
}: {
  value: string;
  onChange: (next: string) => void;
  /** What sits under the figure when there is nothing wrong — the balance, usually. */
  caption?: string;
  problem?: string | null;
  /** Shortcut amounts, as decimal strings. */
  chips?: readonly { label: string; amount: string }[];
}) {
  const shown = value || "0";

  // A physical keyboard should work too; it is how this gets tested on a laptop.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key === "Backspace" ? "del" : event.key;
      if (!isAmountKey(key)) return;
      event.preventDefault();
      onChange(pressAmountKey(value, key));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [value, onChange]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4">
        <p
          aria-live="polite"
          className={`numeric font-semibold leading-none ${sizeFor(shown.length)} ${value ? "" : "text-muted/50"}`}
        >
          <span className="align-[0.32em] text-[0.46em] font-medium text-muted">$</span>
          {shown}
        </p>
        <p className={`min-h-5 text-sm ${problem ? "font-medium text-danger" : "text-muted"}`}>{problem ?? caption}</p>
      </div>

      {chips && chips.length > 0 && (
        <div className="mb-4 flex justify-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChange(chip.amount)}
              className="pressable rounded-full bg-surface px-4 py-2 text-sm font-medium"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-2 gap-y-1">
        {AMOUNT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === "del" ? "Delete" : key}
            onClick={() => onChange(pressAmountKey(value, key))}
            className="pressable flex h-16 items-center justify-center rounded-2xl text-2xl font-medium active:bg-surface"
          >
            {key === "del" ? <Backspace className="h-6 w-6" /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}

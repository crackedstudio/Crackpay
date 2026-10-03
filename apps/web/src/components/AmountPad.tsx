"use client";

import { useEffect } from "react";
import { AMOUNT_KEYS, isAmountKey, pressAmountKey } from "@/lib/amount-input";
import { Backspace } from "./icons";
import { Chip } from "./ui";

/**
 * Entering an amount is the one thing this app exists to do, so it gets a
 * purpose-built screen rather than a text field: a figure large enough to read
 * at arm's length and a keypad under the thumb. The value stays a decimal string
 * here — `parseAmount` turns it into base units once, at the edge of the flow.
 *
 * The keypad is a ruled grid rather than floating digits: it should read as a
 * calculator, which is a thing people already know how to use.
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
    <div className="-mx-5 flex flex-1 flex-col px-5">
      <div className="flex flex-1 flex-col items-center justify-center gap-3.5 py-4">
        <p aria-live="polite" className={`figure ${sizeFor(shown.length)} ${value ? "text-ink" : "text-hair"}`}>
          <span className="mr-0.5 align-[0.5em] text-[0.46em] font-semibold text-muted">$</span>
          {shown}
        </p>
        <p className={`min-h-5 text-sm ${problem ? "font-semibold text-danger" : "text-muted"}`}>{problem ?? caption}</p>
      </div>

      {chips && chips.length > 0 && (
        <div className="mb-3.5 flex justify-center gap-2">
          {chips.map((chip) => (
            <Chip key={chip.label} onClick={() => onChange(chip.amount)} className="numeric">
              {chip.label}
            </Chip>
          ))}
        </div>
      )}

      {/* The 1.5px gaps are the ink showing through: the grid is ruled, not spaced. */}
      <div className="grid grid-cols-3 gap-[1.5px] overflow-hidden rounded-lg border-[1.5px] border-ink bg-ink">
        {AMOUNT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === "del" ? "Delete" : key}
            onClick={() => onChange(pressAmountKey(value, key))}
            className="pressable numeric flex h-[3.625rem] items-center justify-center bg-card text-2xl font-semibold text-ink active:bg-surface"
          >
            {key === "del" ? <Backspace className="h-6 w-6" /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}

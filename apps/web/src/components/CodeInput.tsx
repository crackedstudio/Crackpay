"use client";

import { useRef } from "react";

/**
 * Six boxes for the SMS code. It is one real input underneath — that is what
 * lets the OS one-time-code autofill and a pasted code both land correctly —
 * with the digits drawn on top of it. The box waiting for the next digit is
 * outlined in go green and lifted onto a hard shadow, so the cursor is visible
 * in daylight without a blinking caret.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  return (
    <div className="relative">
      <input
        ref={input}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={`${length}-digit code`}
        autoFocus={autoFocus}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      <div aria-hidden className="pointer-events-none grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {digits.map((digit, index) => {
          const cursor = index === value.length && value.length < length;
          return (
            <span
              key={index}
              className={`numeric flex h-[3.75rem] items-center justify-center rounded-md border-[1.5px] bg-card text-[1.625rem] font-bold ${
                cursor ? "border-go shadow-[3px_3px_0_var(--ink)]" : "border-ink"
              }`}
            >
              {digit}
            </span>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";

/**
 * Six boxes for the SMS code. It is one real input underneath — that is what
 * lets the OS one-time-code autofill and a pasted code both land correctly —
 * with the digits drawn on top of it.
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
  const cursor = Math.min(value.length, length - 1);

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
        className="absolute inset-0 h-full w-full opacity-0"
      />
      <div aria-hidden className="pointer-events-none flex justify-between gap-2">
        {digits.map((digit, index) => (
          <span
            key={index}
            className={`numeric flex h-16 flex-1 items-center justify-center rounded-2xl border bg-card text-2xl font-semibold ${
              index === cursor && value.length < length ? "border-accent" : "border-line"
            }`}
          >
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
}

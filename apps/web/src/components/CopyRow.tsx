"use client";

import { useState } from "react";

export function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  }

  return (
    <button onClick={copy} className="flex w-full items-center justify-between gap-3 py-3 text-left">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-muted">{label}</span>
        <span className="truncate font-medium">{display ?? value}</span>
      </span>
      <span className="shrink-0 text-sm text-accent">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

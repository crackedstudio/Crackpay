"use client";

import { useState, type ReactNode } from "react";
import { useToast } from "./Toast";
import { Check, Copy } from "./icons";
import { ListRow } from "./ui";

/** A value worth copying, with the copy built into the whole row. */
export function CopyRow({
  label,
  value,
  display,
  icon,
  className,
}: {
  label: string;
  value: string;
  display?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(`${label} copied`);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Copy failed", error);
      toast("Couldn't copy — select the text instead");
    }
  }

  return (
    <ListRow
      label={label}
      value={display ?? value}
      icon={icon}
      className={className}
      onClick={copy}
      trailing={
        <span className={`shrink-0 ${copied ? "text-money" : "text-muted"}`}>
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </span>
      }
    />
  );
}

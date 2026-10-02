import type { ButtonHTMLAttributes, ReactNode } from "react";

// The admin is a desk tool, not the phone wallet: denser controls, wider layout.

export const inputClass =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-foreground disabled:bg-surface disabled:text-muted";

const buttonTones = {
  primary: "bg-foreground text-background",
  secondary: "border border-line bg-card text-foreground",
  danger: "bg-danger-soft text-danger",
} as const;

export function AdminButton({
  tone = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof buttonTones }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium disabled:opacity-40 ${buttonTones[tone]} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-muted">{hint}</span>}
    </label>
  );
}

const pillTones = {
  on: "bg-accent-soft text-accent",
  off: "bg-surface text-muted",
  warn: "bg-warning-soft text-warning",
  bad: "bg-danger-soft text-danger",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof pillTones; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pillTones[tone]}`}>{children}</span>;
}

export function Notice({ tone = "bad", children }: { tone?: "bad" | "on"; children: ReactNode }) {
  if (!children) return null;
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${pillTones[tone]}`}>
      {children}
    </p>
  );
}

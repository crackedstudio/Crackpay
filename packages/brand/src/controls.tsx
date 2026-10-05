import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ------------------------------------------------------------------ buttons */

const buttonSizes = {
  lg: "h-14 px-6 text-base",
  md: "h-11 px-5 text-sm",
} as const;

/*
 * Every solid control is an ink-ruled block sitting on the page with a hard
 * shadow under it, and presses 3px down into that shadow. `ghost` is the one
 * exception: it is bare text, so it has nothing to press into.
 */
const buttonVariants = {
  primary: "hard border-[1.5px] border-ink bg-go text-go-ink font-semibold",
  secondary: "hard border-[1.5px] border-ink bg-card text-ink font-semibold",
  subtle: "border-[1.5px] border-hair bg-surface text-ink font-medium",
  ghost: "text-muted font-medium",
  danger: "border-[1.5px] border-danger bg-danger-soft text-danger font-bold",
} as const;

export type Variant = keyof typeof buttonVariants;
export type Size = keyof typeof buttonSizes;

const buttonBase =
  "pressable flex w-full items-center justify-center gap-2 rounded-md disabled:pointer-events-none disabled:opacity-40";

/** The button's class string on its own, for the rare control that has to be a
 *  different element — a nav link in the site header, a mock in a screenshot. */
export function buttonClass(variant: Variant, size: Size, className = "") {
  return `${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "lg",
  loading = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks input, without changing the label's width. */
  loading?: boolean;
}) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={props.disabled ?? loading} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "lg",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`animate-spin ${className}`} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
    </svg>
  );
}

/* ------------------------------------------------------------------- labels */

/** The mono caps label that names a field, a section or a value. */
export function Label({ className = "", children }: { className?: string; children: ReactNode }) {
  return <span className={`label text-muted ${className}`}>{children}</span>;
}

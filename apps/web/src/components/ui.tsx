import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Label } from "@crackpay/brand";
import { Alert, ArrowLeft, Check, Info } from "./icons";

/*
 * Buttons, the spinner and the mono label come from `@crackpay/brand`, shared
 * with the marketing site, and are re-exported here so every `@/components/ui`
 * import keeps working. Everything below is the wallet app's own.
 */
export { Button, LinkButton, Label, Spinner, buttonClass } from "@crackpay/brand";
export type { Size, Variant } from "@crackpay/brand";

/** A 44pt tap target for a bare icon. `label` is required — it is the name. */
export function IconButton({
  label,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`pressable flex h-11 w-11 items-center justify-center text-ink disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** A small outlined pill: an amount shortcut, a filter, a secondary jump. */
export function Chip({
  active = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`pressable h-9 shrink-0 rounded-full border-[1.5px] border-ink px-4 text-sm font-semibold ${
        active ? "bg-ink text-paper" : "bg-card text-ink"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * A section's name, set as a mono label over an ink rule. The rule is what
 * divides the page into parts — there are no cards doing that job.
 */
export function SectionHeading({
  children,
  trailing,
  level = 2,
}: {
  children: ReactNode;
  /** A "See all" link or a count, set against the right edge. */
  trailing?: ReactNode;
  level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag className="label flex items-baseline justify-between border-b-[1.5px] border-ink pb-1.5">
      <span>{children}</span>
      {trailing}
    </Tag>
  );
}

/* ------------------------------------------------------------------- inputs */

export function TextField({
  label,
  tone = "label",
  hint,
  status,
  prefix,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  /**
   * "label" names the field in mono caps. "question" puts the field's purpose
   * as the screen's heading instead — used where the field *is* the screen.
   */
  tone?: "label" | "question";
  hint?: ReactNode;
  /** Tints the hint: a handle that is taken, an amount above the balance. */
  status?: "ok" | "error";
  /** Fixed text inside the field, like the "@" on a handle. */
  prefix?: string;
}) {
  const hintTone = status === "error" ? "text-danger font-medium" : status === "ok" ? "text-money font-semibold" : "text-muted";
  return (
    <label className={`flex flex-col ${tone === "question" ? "gap-3.5" : "gap-2"}`}>
      {tone === "question" ? <span className="ask text-[1.625rem]">{label}</span> : <Label>{label}</Label>}
      {/* The ink border is what makes a field legible outdoors. */}
      <span className="flex items-center gap-0.5 rounded-md border-[1.5px] border-ink bg-card px-4 focus-within:shadow-[0_3px_0_var(--ink)]">
        {prefix && <span className="text-xl text-muted">{prefix}</span>}
        <input
          className={`h-14 min-w-0 flex-1 bg-transparent text-xl font-medium outline-none placeholder:font-normal placeholder:text-muted/60 ${className}`}
          {...props}
        />
      </span>
      {hint && <span className={`text-sm ${hintTone}`}>{hint}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------- callouts */

const calloutTones = {
  error: { wrap: "border-danger bg-danger-soft text-danger", Icon: Alert },
  info: { wrap: "border-ink bg-card text-ink", Icon: Info },
  warn: { wrap: "border-warn bg-warn-soft text-warn", Icon: Alert },
  success: { wrap: "border-money bg-money-soft text-money", Icon: Check },
} as const;

/** A ruled block for one piece of news: an error, a tip, a confirmation. */
export function Callout({
  tone = "info",
  children,
}: {
  tone?: keyof typeof calloutTones;
  children: ReactNode;
}) {
  if (!children) return null;
  const { wrap, Icon } = calloutTones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex animate-fade items-start gap-3 rounded-md border-[1.5px] px-4 py-3.5 text-sm leading-5 ${wrap}`}
    >
      <Icon className="mt-px h-5 w-5" />
      <div className="min-w-0 flex-1 break-words [&_strong]:font-bold">{children}</div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <Callout tone="error">{children}</Callout>;
}

/* ------------------------------------------------------------------ surfaces */

/** An ink-ruled block. Used for facts being checked, not for dividing the page. */
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-lg border-[1.5px] border-ink bg-card ${className}`}>{children}</div>;
}

/**
 * A row in a settings or detail list.
 *  - "stacked" (the default) puts a quiet mono label over a prominent value,
 *    for things the row is really about: a handle, an address.
 *  - "inline" puts the label left and the value right, for facts being checked
 *    at a glance: a fee, a date, what is left afterwards.
 */
export function ListRow({
  label,
  value,
  icon,
  trailing,
  layout = "stacked",
  className = "",
  ...rest
}: {
  label: ReactNode;
  value?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  layout?: "stacked" | "inline";
  className?: string;
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never } | { href?: never; onClick?: never })) {
  const body =
    layout === "inline" ? (
      <>
        {icon && <span className="text-muted">{icon}</span>}
        <span className="text-sm text-muted">{label}</span>
        <span className="ml-auto min-w-0 truncate font-semibold">{value}</span>
        {trailing}
      </>
    ) : (
      <>
        {icon && <span className="text-muted">{icon}</span>}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Label className="truncate">{label}</Label>
          {value !== undefined && <span className="truncate font-semibold">{value}</span>}
        </span>
        {trailing}
      </>
    );
  const classes = `pressable flex w-full items-center gap-3 px-4 text-left ${
    layout === "inline" ? "py-3.5" : "py-3.5"
  } ${className}`;

  if (rest.href) {
    const external = rest.href.startsWith("http");
    return external ? (
      <a href={rest.href} target="_blank" rel="noreferrer" className={classes}>
        {body}
      </a>
    ) : (
      <Link href={rest.href} className={classes}>
        {body}
      </Link>
    );
  }
  if (rest.onClick) {
    return (
      <button type="button" onClick={rest.onClick} className={classes}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}

/**
 * A row with an on/off switch, in the style of a phone's settings screen.
 * `disabled` shows the state but will not change it.
 */
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="pressable flex w-full items-center gap-3 px-4 py-4 text-left disabled:pointer-events-none"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{label}</span>
        {description && <span className="text-sm leading-5 text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full border-[1.5px] border-ink transition-colors ${
          checked ? "bg-go" : "bg-surface"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 rounded-full border-[1.5px] border-ink bg-card transition-all ${
            checked ? "left-[1.4375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-shimmer rounded-sm bg-surface ${className}`} />;
}

/**
 * The stamp. The one piece of motion in the product, and it means exactly one
 * thing: money landed. Nothing else gets it.
 */
export function Stamp({ size = "lg" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-24 w-24" : "h-[5.5rem] w-[5.5rem]";
  const tick = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  return (
    <span
      aria-hidden
      className={`animate-stamp flex items-center justify-center rounded-[0.625rem] border-2 border-ink bg-go text-go-ink ${box}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square" className={tick}>
        <path d="M5 13l4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

/**
 * What a list looks like before it has anything in it. The empty case shows a
 * ghosted figure, because "no payments yet" is a fact about money; the failure
 * case shows an outlined tile, because it is a fact about the app.
 */
export function EmptyState({
  figure,
  icon,
  title,
  body,
  action,
}: {
  /** A ghosted display figure — "$0.00" — for a list that is simply empty. */
  figure?: string;
  /** An outlined icon tile, for a list that could not be loaded. */
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      {figure !== undefined && <span className="display numeric mb-1 text-5xl text-hair">{figure}</span>}
      {icon && (
        <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-lg border-[1.5px] border-ink shadow-[3px_3px_0_var(--ink)]">
          {icon}
        </span>
      )}
      <p className="font-bold">{title}</p>
      <p className="max-w-[18rem] text-sm leading-5 text-muted">{body}</p>
      {action && <div className="mt-3 w-full max-w-[14rem]">{action}</div>}
    </div>
  );
}

/**
 * How far through a flow the user is: a ruled bar per step plus the count in
 * words, because a row of dots alone does not say how many are left.
 */
export function StepProgress({ step, of }: { step: number; of: number }) {
  return (
    <div className="flex flex-1 items-center gap-2.5 pr-4">
      <div
        className="grid flex-1 gap-1"
        style={{ gridTemplateColumns: `repeat(${of}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={of}
      >
        {Array.from({ length: of }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-[2px] border-[1.5px] border-ink ${index < step ? "bg-ink" : "bg-transparent"}`}
          />
        ))}
      </div>
      <span className="font-mono text-[0.6875rem] font-semibold">
        {step} / {of}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------------- shell */

/**
 * The phone-width column every screen sits in.
 *  - `back` is a route or an in-flow handler; the arrow and any "go back"
 *    control on the screen must agree, so both read this one prop.
 *  - `footer` sticks above the fold with the primary action in it.
 *  - `inset` leaves room for the bottom tab bar on top-level screens, for the
 *    scrolling content and for a footer sitting above the bar.
 */
export function Screen({
  title,
  back,
  action,
  lead,
  footer,
  footerRule = false,
  inset = false,
  children,
}: {
  title?: ReactNode;
  back?: string | (() => void);
  /** Right-hand slot in the app bar. */
  action?: ReactNode;
  /** Replaces the title row entirely — a step indicator, say. */
  lead?: ReactNode;
  footer?: ReactNode;
  /** Rules the footer off from the content, for a standing action bar. */
  footerRule?: boolean;
  inset?: boolean;
  children: ReactNode;
}) {
  const hasBar = Boolean(title || back || action || lead);
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col">
      {hasBar && (
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 bg-paper px-2 pt-[env(safe-area-inset-top)]">
          {back !== undefined &&
            (typeof back === "string" ? (
              <Link href={back} aria-label="Back" className="pressable flex h-11 w-11 items-center justify-center">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : (
              <IconButton label="Back" onClick={back}>
                <ArrowLeft className="h-5 w-5" />
              </IconButton>
            ))}
          <div className={`flex min-w-0 flex-1 items-center ${back === undefined ? "pl-3" : ""}`}>
            {lead ?? (title && <h1 className="ask truncate text-[1.375rem]">{title}</h1>)}
          </div>
          {action}
        </header>
      )}

      {/* One pb-* only: two of them on the same element leaves the winner to
          stylesheet order rather than to what is written here. */}
      <main
        className={`flex flex-1 flex-col gap-5 px-5 ${hasBar ? "pt-2" : "pt-[max(1.25rem,env(safe-area-inset-top))]"} ${
          inset
            ? "pb-[calc(var(--tabbar)+env(safe-area-inset-bottom)+1.5rem)]"
            : "pb-6"
        }`}
      >
        {children}
      </main>

      {footer && (
        <div
          className={`sticky z-20 bg-paper px-5 pt-3 ${footerRule ? "border-t-[1.5px] border-ink" : ""} ${
            inset
              ? "bottom-[calc(var(--tabbar)+env(safe-area-inset-bottom))] pb-3.5"
              : "bottom-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          }`}
        >
          <div className="flex flex-col gap-1.5">{footer}</div>
        </div>
      )}
    </div>
  );
}

/** A full-screen hold while we work out who the user is. Never a blank page. */
export function ScreenSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-5 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex h-14 items-center justify-between">
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-6 w-6" />
      </div>
      <div className="flex flex-col gap-3 border-b-[1.5px] border-ink pb-5 pt-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-14 w-52" />
      </div>
      <Skeleton className="h-3 w-16" />
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Skeleton className="h-[2.625rem] w-[2.625rem] rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}

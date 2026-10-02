import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Alert, ArrowLeft, Check, Info } from "./icons";

/* ------------------------------------------------------------------ buttons */

const buttonSizes = {
  lg: "h-14 px-6 text-base",
  md: "h-11 px-5 text-sm",
} as const;

const buttonVariants = {
  primary: "bg-accent text-accent-foreground font-semibold shadow-card",
  secondary: "border border-line bg-card text-foreground font-medium",
  subtle: "bg-surface text-foreground font-medium",
  ghost: "text-muted font-medium",
  danger: "bg-danger-soft text-danger font-semibold",
} as const;

type Variant = keyof typeof buttonVariants;
type Size = keyof typeof buttonSizes;

const buttonBase =
  "pressable flex w-full items-center justify-center gap-2 rounded-full disabled:pointer-events-none disabled:opacity-40";

function buttonClass(variant: Variant, size: Size, className = "") {
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

/** A 44pt round tap target for a bare icon. `label` is required — it is the name. */
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
      className={`pressable flex h-11 w-11 items-center justify-center rounded-full text-foreground disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`animate-spin ${className}`} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------- inputs */

export function TextField({
  label,
  hint,
  status,
  prefix,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  /** Tints the hint: a handle that is taken, an amount above the balance. */
  status?: "ok" | "error";
  /** Fixed text inside the field, like the "@" on a handle. */
  prefix?: string;
}) {
  const hintColor = status === "error" ? "text-danger" : status === "ok" ? "text-accent" : "text-muted";
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="flex items-center gap-1 rounded-2xl border border-line bg-card px-4 transition-colors focus-within:border-foreground focus-within:ring-4 focus-within:ring-foreground/5">
        {prefix && <span className="text-lg text-muted">{prefix}</span>}
        <input
          className={`h-14 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted/60 ${className}`}
          {...props}
        />
      </span>
      {hint && <span className={`text-sm ${hintColor}`}>{hint}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------- callouts */

const calloutTones = {
  error: { wrap: "bg-danger-soft text-danger", Icon: Alert },
  info: { wrap: "bg-surface text-foreground", Icon: Info },
  success: { wrap: "bg-accent-soft text-accent", Icon: Check },
} as const;

/** A tinted block for one piece of news: an error, a tip, a confirmation. */
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
      className={`flex animate-fade items-start gap-3 rounded-2xl p-4 text-sm ${wrap}`}
    >
      <Icon className="mt-px h-5 w-5" />
      <div className="min-w-0 flex-1 break-words [&_strong]:font-semibold">{children}</div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <Callout tone="error">{children}</Callout>;
}

/* ------------------------------------------------------------------ surfaces */

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl border border-line bg-card ${className}`}>{children}</div>;
}

/**
 * A row in a settings or detail list.
 *  - "stacked" (the default) puts a quiet label over a prominent value, for
 *    things the row is really about: a handle, an address.
 *  - "inline" puts the label left and the value right, for facts being checked
 *    at a glance: a fee, a date, what is left afterwards.
 */
export function ListRow({
  label,
  value,
  icon,
  trailing,
  layout = "stacked",
  ...rest
}: {
  label: ReactNode;
  value?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  layout?: "stacked" | "inline";
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never } | { href?: never; onClick?: never })) {
  const body =
    layout === "inline" ? (
      <>
        {icon && <span className="text-muted">{icon}</span>}
        <span className="text-sm text-muted">{label}</span>
        <span className="ml-auto min-w-0 truncate font-medium">{value}</span>
        {trailing}
      </>
    ) : (
      <>
        {icon && <span className="text-muted">{icon}</span>}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm text-muted">{label}</span>
          {value !== undefined && <span className="truncate font-medium">{value}</span>}
        </span>
        {trailing}
      </>
    );
  const className = `pressable flex w-full items-center gap-3 px-4 text-left ${layout === "inline" ? "py-3.5" : "py-4"}`;

  if (rest.href) {
    const external = rest.href.startsWith("http");
    return external ? (
      <a href={rest.href} target="_blank" rel="noreferrer" className={className}>
        {body}
      </a>
    ) : (
      <Link href={rest.href} className={className}>
        {body}
      </Link>
    );
  }
  if (rest.onClick) {
    return (
      <button type="button" onClick={rest.onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-shimmer rounded-full bg-surface ${className}`} />;
}

/** What a list looks like before it has anything in it. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-muted">{icon}</span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-[18rem] text-sm text-muted">{body}</p>
      {action && <div className="mt-3 w-full max-w-[14rem]">{action}</div>}
    </div>
  );
}

/** Dots showing how far through a flow the user is. Position is 1-based. */
export function StepProgress({ step, of }: { step: number; of: number }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={of}>
      {Array.from({ length: of }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all ${index < step ? "w-5 bg-accent" : "w-1.5 bg-line"}`}
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- shell */

/**
 * The phone-width column every screen sits in.
 *  - `back` is a route or an in-flow handler; the arrow and any "go back"
 *    control on the screen must agree, so both read this one prop.
 *  - `footer` sticks above the fold with the primary action in it.
 *  - `inset` leaves room for the bottom tab bar on top-level screens.
 */
export function Screen({
  title,
  back,
  action,
  lead,
  footer,
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
  inset?: boolean;
  children: ReactNode;
}) {
  const hasBar = Boolean(title || back || action || lead);
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col">
      {hasBar && (
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 bg-background/85 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          {back !== undefined &&
            (typeof back === "string" ? (
              <Link
                href={back}
                aria-label="Back"
                className="pressable flex h-11 w-11 items-center justify-center rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : (
              <IconButton label="Back" onClick={back}>
                <ArrowLeft className="h-5 w-5" />
              </IconButton>
            ))}
          <div className={`flex min-w-0 flex-1 items-center ${back === undefined ? "pl-3" : ""}`}>
            {lead ?? (title && <h1 className="truncate text-lg font-semibold">{title}</h1>)}
          </div>
          {action}
        </header>
      )}

      {/* One pb-* only: two of them on the same element leaves the winner to
          stylesheet order rather than to what is written here. */}
      <main
        className={`flex flex-1 flex-col gap-5 px-5 ${hasBar ? "pt-2" : "pt-[max(1.25rem,env(safe-area-inset-top))]"} ${
          inset ? "pb-[max(7rem,calc(env(safe-area-inset-bottom)+6.5rem))]" : "pb-6"
        }`}
      >
        {children}
      </main>

      {footer && (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex flex-col gap-2">{footer}</div>
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
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-9" />
      </div>
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
      </div>
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const buttonBase =
  "flex h-12 w-full items-center justify-center rounded-full px-5 text-base font-medium transition-opacity disabled:opacity-40";
const buttonStyles = {
  primary: "bg-accent text-accent-foreground",
  secondary: "border border-line bg-card text-foreground",
  ghost: "text-muted",
} as const;

type Variant = keyof typeof buttonStyles;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props} />;
}

export function LinkButton({ href, variant = "primary", children }: { href: string; variant?: Variant; children: ReactNode }) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonStyles[variant]}`}>
      {children}
    </Link>
  );
}

export function TextField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <input
        className="h-12 rounded-xl border border-line bg-card px-4 text-base outline-none focus:border-foreground"
        {...props}
      />
      {hint && <span className="text-muted">{hint}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="break-words text-sm text-danger">
      {children}
    </p>
  );
}

/** The phone-width column every screen sits in. `back` adds a header with a back link. */
export function Screen({ title, back, children }: { title?: string; back?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      {(title || back) && (
        <header className="flex h-10 items-center gap-3">
          {back && (
            <Link href={back} aria-label="Back" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-xl">
              ←
            </Link>
          )}
          {title && <h1 className="text-lg font-semibold">{title}</h1>}
        </header>
      )}
      {children}
    </main>
  );
}

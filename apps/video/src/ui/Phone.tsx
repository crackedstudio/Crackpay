import { Mark } from "@crackpay/brand/brand";
import type { IconProps } from "@crackpay/brand/icons";
import type { ReactNode } from "react";

/*
 * The app, drawn rather than screenshotted — the same decision the marketing site
 * makes, and for a better reason here: a screenshot would be stuck at one moment,
 * and these screens have to animate.
 *
 * Geometry is the landing page's phone mock to the pixel, at its own 328px width,
 * multiplied by `s` to reach the size the frame needs. Scaling the numbers rather
 * than the rendered element keeps the 1.5px ink rules crisp at 1080p and keeps the
 * proportions honest: what plays in the film is the shape that ships.
 */

/** The landing page's phone mock width, which every number below is relative to. */
const BASE = 328;

export type Scaled = { s: number };

/** Multiplier that turns a landing-page pixel into a film pixel. */
export function scaleFor(width: number): number {
  return width / BASE;
}

export function Phone({
  width,
  rotate = -1.5,
  children,
}: {
  width: number;
  /** The site sits the phone at −1.5°. Scenes that press it flat pass 0. */
  rotate?: number;
  children: ReactNode;
}) {
  const s = scaleFor(width);
  return (
    <div
      className="border-ink bg-card"
      style={{
        width,
        borderRadius: 28 * s,
        borderWidth: 1.5 * s,
        borderStyle: "solid",
        padding: 18 * s,
        boxShadow: `${6 * s}px ${6 * s}px 0 var(--ink)`,
        transform: `rotate(${rotate}deg)`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/** Avatar, handle, mark. The only chrome the app's home screen has. */
export function PhoneHeader({ s, handle = "@sadiq" }: Scaled & { handle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 * s }}>
        <span
          className="border-ink bg-surface"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32 * s,
            height: 32 * s,
            borderRadius: "9999px",
            borderWidth: 1.5 * s,
            borderStyle: "solid",
            fontSize: 11 * s,
            fontWeight: 700,
          }}
        >
          SA
        </span>
        <span style={{ fontSize: 16 * s, fontWeight: 600 }}>{handle}</span>
      </span>
      <Mark className="text-muted" style={{ width: 19.4 * s, height: 20 * s }} />
    </div>
  );
}

/** A mono label, as the app sets section names and field names. */
export function MicroLabel({ s, children, tone = "muted" }: Scaled & { children: ReactNode; tone?: "muted" | "ink" }) {
  return (
    <span className={`label ${tone === "ink" ? "text-ink" : "text-muted"}`} style={{ fontSize: 11 * s }}>
      {children}
    </span>
  );
}

/** The balance block: label, figure, and the ink rule the figure sits on. */
export function BalanceBlock({ s, label, figure }: Scaled & { label: string; figure: ReactNode }) {
  return (
    <div
      className="border-ink"
      style={{
        marginTop: 24 * s,
        display: "flex",
        flexDirection: "column",
        gap: 6 * s,
        borderBottomWidth: 1.5 * s,
        borderBottomStyle: "solid",
      }}
    >
      <MicroLabel s={s}>{label}</MicroLabel>
      <span className="figure" style={{ fontSize: 46 * s, paddingBottom: 16 * s }}>
        {figure}
      </span>
    </div>
  );
}

/**
 * A control: ink-ruled block, hard shadow under it. Green is only ever on the one
 * that moves money or says go, which is the whole rule the token sheet states.
 */
export function Control({
  s,
  tone,
  icon: Icon,
  children,
  pressed = false,
  grow = false,
}: Scaled & {
  tone: "go" | "card";
  icon?: (p: IconProps) => ReactNode;
  children: ReactNode;
  /** Pressed sits flush with its own shadow, as `.hard` does in the app. */
  pressed?: boolean;
  grow?: boolean;
}) {
  const lift = pressed ? 0 : 3 * s;
  return (
    <span
      className={`border-ink ${tone === "go" ? "bg-go text-go-ink" : "bg-card text-ink"}`}
      style={{
        display: "flex",
        flex: grow ? "1 1 0" : undefined,
        height: 48 * s,
        alignItems: "center",
        justifyContent: "center",
        gap: 8 * s,
        borderRadius: 6 * s,
        borderWidth: 1.5 * s,
        borderStyle: "solid",
        fontSize: 16 * s,
        fontWeight: 700,
        boxShadow: `0 ${lift}px 0 var(--ink)`,
        transform: `translateY(${(3 * s - lift)}px)`,
      }}
    >
      {Icon ? <Icon style={{ width: 20 * s, height: 20 * s }} strokeWidth={2.25} /> : null}
      {children}
    </span>
  );
}

/** One line of the activity feed. Arriving money is the only text set in `money`. */
export function TxRow({
  s,
  who,
  amount,
  incoming = false,
  first = false,
}: Scaled & { who: string; amount: string; incoming?: boolean; first?: boolean }) {
  return (
    <div
      className="border-hair"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: first ? 0 : 1 * s,
        borderTopStyle: "solid",
        paddingTop: 10 * s,
        paddingBottom: 10 * s,
      }}
    >
      <span style={{ fontSize: 15 * s, fontWeight: 600 }}>{who}</span>
      <span className={`numeric ${incoming ? "text-money" : ""}`} style={{ fontSize: 15 * s, fontWeight: 700 }}>
        {amount}
      </span>
    </div>
  );
}

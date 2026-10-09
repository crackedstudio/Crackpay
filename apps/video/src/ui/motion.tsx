import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/*
 * The design system's motion, ported frame by frame.
 *
 * `packages/brand/tokens.css` defines this motion as CSS keyframes, which
 * Remotion cannot render: a rendered frame is a still, and a CSS animation has no
 * defined position at an arbitrary one. So each keyframe set below is a reading
 * of the stylesheet's own, with the same durations, the same cubic-bezier and the
 * same stops. When the stylesheet's motion changes, these change with it.
 */

/** The system's single easing curve, from `--animate-rise` and friends. */
const BRAND_EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Seconds → frames, at whatever fps the composition runs. */
function useSeconds() {
  const { fps } = useVideoConfig();
  return (seconds: number) => seconds * fps;
}

type Timed = {
  /** Seconds to wait before this starts, measured from the start of its scene. */
  delay?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * `@keyframes rise` — 16px up and in over 0.22s. The workhorse: every line of
 * copy and every row in a list arrives this way.
 */
export function Rise({ delay = 0, children, className, style }: Timed) {
  const frame = useCurrentFrame();
  const sec = useSeconds();
  const t = interpolate(frame - sec(delay), [0, sec(0.22)], [0, 1], {
    easing: BRAND_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div className={className} style={{ ...style, opacity: t, transform: `translateY(${16 * (1 - t)}px)` }}>
      {children}
    </div>
  );
}

/**
 * `@keyframes pop` — 0.6 → 1.06 → 1 over 0.4s. For a thing appearing in place
 * rather than arriving from somewhere: a tick, an icon, a tile.
 */
export function Pop({ delay = 0, children, className, style }: Timed) {
  const frame = useCurrentFrame();
  const sec = useSeconds();
  const t = interpolate(frame - sec(delay), [0, sec(0.4)], [0, 1], {
    easing: BRAND_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(t, [0, 0.6, 1], [0.6, 1.06, 1]);
  const opacity = interpolate(t, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div className={className} style={{ ...style, opacity, transform: `scale(${scale})` }}>
      {children}
    </div>
  );
}

/**
 * `@keyframes stamp` + `@keyframes thud` — the signature. Money landing hits the
 * screen like a rubber stamp: in at 170% and −16°, overshoot, settle at −4° as
 * the hard shadow drops under it. The two keyframe sets run together over 0.5s,
 * and the shadow is held at zero for the first 45% so it appears to land.
 *
 * Reserved for money and for the mark. A stamp on anything else spends it.
 *
 * `shadow` is off for the bare mark: the thud drops an ink shadow, and an ink
 * shadow under an ink glyph is just a smudge. It is on for anything that stamps
 * as a filled block, which is what the stylesheet assumes.
 *
 * `settle` is the angle it comes to rest at. The stylesheet's −4° is right for a
 * badge, which is what a stamp is; a block that sits in a layout settles at 0,
 * because leaving a balance and the ink rule under it permanently askew reads as
 * a broken screen rather than as a stamp.
 */
export function Stamp({
  delay = 0,
  shadow = true,
  settle = -4,
  children,
  className,
  style,
}: Timed & { shadow?: boolean; settle?: number }) {
  const frame = useCurrentFrame();
  const sec = useSeconds();
  const t = interpolate(frame - sec(delay), [0, sec(0.5)], [0, 1], {
    easing: BRAND_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(t, [0, 0.5, 0.72, 1], [1.7, 0.93, 1.04, 1]);
  const rotate = interpolate(t, [0, 0.5, 0.72, 1], [-16, -3, -5, settle]);
  const opacity = interpolate(t, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const offset = interpolate(t, [0.45, 1], [0, 5], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      className={className}
      style={{
        ...style,
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        boxShadow: shadow ? `${offset}px ${offset}px 0 var(--ink)` : undefined,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A sheet rising from the bottom edge, the way the app's confirm sheets do.
 * Snappy with the smallest bounce the system allows — a sheet carrying an amount
 * should feel answered, not springy.
 */
export function Sheet({ delay = 0, children, className, style }: Timed) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay * fps, fps, config: { damping: 22, stiffness: 190 } });

  return (
    <div className={className} style={{ ...style, transform: `translateY(${(1 - t) * 100}%)` }}>
      {children}
    </div>
  );
}

/**
 * Eased 0 → 1 over an arbitrary window, for the cases that are not one of the
 * named keyframe sets: a bar filling, a highlight sweeping, a figure counting.
 */
export function useEased(delay: number, duration: number): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame - delay * fps, [0, duration * fps], [0, 1], {
    easing: BRAND_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** True once `at` seconds have passed in this scene. For a hard state change. */
export function usePast(at: number): boolean {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame >= at * fps;
}

/**
 * A figure counting to its value. Amounts are formatted to cents and set in
 * tabular figures everywhere in CrackPay, so the digits do not jitter as they run.
 */
export function useCountedCents(target: number, delay: number, duration: number): string {
  const t = useEased(delay, duration);
  const cents = Math.round(interpolate(t, [0, 1], [0, target]));
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * A string typed out by slicing, never by fading characters in — a faded
 * character is legible before it is meant to be and reads as a glitch.
 */
export function useTyped(text: string, delay: number, perCharacter = 0.045): string {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = (frame - delay * fps) / fps;
  if (elapsed <= 0) return "";
  return text.slice(0, Math.floor(elapsed / perCharacter));
}

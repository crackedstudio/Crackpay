import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useFormat } from "../layout.ts";
import { fontVariables } from "../fonts.ts";

/**
 * Every scene sits on paper, gutter-padded, with the font variables the token
 * sheet reads. Cuts between scenes are hard — no crossfades anywhere in the film.
 * The design system has no blur and nothing floating, and a dissolve is both.
 */
export function Stage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const f = useFormat();
  return (
    <AbsoluteFill
      className="bg-paper text-ink"
      style={{
        ...fontVariables,
        fontFamily: "var(--font-archivo)",
        padding: f.gutter,
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/**
 * A scene's two halves. Stacked in the feed cut, side by side in the wide one,
 * which is the only layout difference between the two renders.
 */
export function Split({ text, visual }: { text: ReactNode; visual: ReactNode }) {
  const f = useFormat();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: f.vertical ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: f.gap,
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ flex: f.vertical ? "0 0 auto" : "1 1 0", width: "100%", maxWidth: f.columnMax }}>{text}</div>
      <div style={{ flex: f.vertical ? "0 0 auto" : "0 0 auto", display: "flex", justifyContent: "center" }}>
        {visual}
      </div>
    </div>
  );
}

/** The mono section label, over an ink rule. The site divides by rules, not cards. */
export function Kicker({ children }: { children: ReactNode }) {
  const f = useFormat();
  return (
    <div
      className="label border-b-[1.5px] border-ink text-muted"
      style={{ fontSize: f.kicker, paddingBottom: f.kicker * 0.5, marginBottom: f.kicker * 1.4 }}
    >
      {children}
    </div>
  );
}

/** The display voice. One claim, set as large as the frame allows. */
export function Headline({ children, size }: { children: ReactNode; size?: number }) {
  const f = useFormat();
  return (
    <h1 className="display" style={{ fontSize: size ?? f.headline, margin: 0, textWrap: "balance" }}>
      {children}
    </h1>
  );
}

/** The line under a headline. Muted, never competing with it. */
export function Sub({ children }: { children: ReactNode }) {
  const f = useFormat();
  return (
    <p className="text-muted" style={{ fontSize: f.subhead, lineHeight: 1.35, margin: 0, maxWidth: f.columnMax }}>
      {children}
    </p>
  );
}

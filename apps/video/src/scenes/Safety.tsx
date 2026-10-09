import { Mark } from "@crackpay/brand/brand";
import { Face, Shield } from "@crackpay/brand/icons";
import type { IconProps } from "@crackpay/brand/icons";
import type { ReactNode } from "react";
import { useFormat } from "../layout.ts";
import { Headline, Kicker, Stage } from "../ui/stage.tsx";
import { Rise } from "../ui/motion.tsx";

/** The site's three safety promises, in its order and close to its words. */
const PROMISES: { icon: (p: IconProps) => ReactNode; title: string; body: string }[] = [
  { icon: Face, title: "Your face or finger", body: "The unlock you already use approves each payment." },
  { icon: Shield, title: "Nothing to write down", body: "No seed phrase exists — not in setup, not in recovery." },
  { icon: Mark, title: "We cannot touch it", body: "You hold the account. CrackPay cannot move your dollars." },
];

/**
 * Self-custody, said plainly. Each promise sits under its own ink rule — the
 * system divides a page with rules, not cards, and three cards here would read
 * as three features rather than one design.
 */
export function Safety() {
  const f = useFormat();

  return (
    <Stage>
      <div style={{ display: "flex", flexDirection: "column", gap: f.vertical ? 72 : 56 }}>
        <div>
          <Rise>
            <Kicker>Who can move it</Kicker>
          </Rise>
          <Rise delay={0.12}>
            <Headline>Only you. That is the whole design.</Headline>
          </Rise>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: f.vertical ? "column" : "row",
            gap: f.vertical ? 34 : 48,
          }}
        >
          {PROMISES.map(({ icon: Icon, title, body }, i) => (
            <Rise key={title} delay={0.45 + i * 0.14} style={{ flex: "1 1 0" }}>
              <div
                className="border-ink"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  borderTopWidth: 1.5,
                  borderTopStyle: "solid",
                  paddingTop: 20,
                }}
              >
                <Icon style={{ width: f.body * 1.3, height: f.body * 1.3 }} />
                <div style={{ fontSize: f.body * 1.12, fontWeight: 700 }}>{title}</div>
                <div className="text-muted" style={{ fontSize: f.body * 0.88, lineHeight: 1.4 }}>
                  {body}
                </div>
              </div>
            </Rise>
          ))}
        </div>
      </div>
    </Stage>
  );
}

import { Mark } from "@crackpay/brand/brand";
import { useFormat } from "../layout.ts";
import { Headline, Stage } from "../ui/stage.tsx";
import { Rise, Stamp } from "../ui/motion.tsx";

/**
 * Three seconds to say the name and the promise, in that order.
 *
 * The mark gets the stamp — it is the one thing besides money that the system
 * lets stamp — and the claim rises under it once it has landed.
 */
export function Hook() {
  const f = useFormat();
  const mark = f.vertical ? 124 : 104;

  return (
    <Stage style={{ alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: f.vertical ? 64 : 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: mark * 0.22 }}>
          {/* The stamp wrapper carries the hard shadow, so the mark itself is bare ink. */}
          <Stamp delay={0.12} shadow={false} style={{ display: "flex" }}>
            <Mark className="text-ink" style={{ width: mark * 0.97, height: mark }} />
          </Stamp>
          <Rise delay={0.52}>
            <span className="display" style={{ fontSize: mark * 0.82 }}>
              CrackPay
            </span>
          </Rise>
        </div>

        <Rise delay={1.05} style={{ textAlign: "center", maxWidth: f.columnMax }}>
          <Headline>Send dollars like a text.</Headline>
        </Rise>
      </div>
    </Stage>
  );
}

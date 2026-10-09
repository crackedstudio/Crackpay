import { Mark } from "@crackpay/brand/brand";
import { useFormat } from "../layout.ts";
import { Headline, Stage, Sub } from "../ui/stage.tsx";
import { Rise, Stamp } from "../ui/motion.tsx";

/**
 * The close. The same ask the site closes on, in the same words, because a viewer
 * who arrives from here should recognise the page they land on.
 *
 * `url` is a prop rather than a constant: the production domain is not chosen yet,
 * and whatever is chosen has to be the passkey domain for good, so this one string
 * is the thing to set before the film is published anywhere.
 */
export function Cta({ url }: { url: string }) {
  const f = useFormat();
  const mark = f.vertical ? 96 : 82;

  return (
    <Stage style={{ alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: f.vertical ? 44 : 34,
          /* Explicit, not `maxWidth`: the centred column would otherwise
             shrink-wrap to its narrowest child and wrap the headline to four. */
          width: "100%",
          maxWidth: f.columnMax,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: mark * 0.24 }}>
          <Stamp delay={0.08} shadow={false} style={{ display: "flex" }}>
            <Mark className="text-ink" style={{ width: mark * 0.97, height: mark }} />
          </Stamp>
          <Rise delay={0.38}>
            <span className="display" style={{ fontSize: mark * 0.82 }}>
              CrackPay
            </span>
          </Rise>
        </div>

        <Rise delay={0.72} style={{ width: "100%" }}>
          {/* Stepped down from the scene headline size: this line is longer than
              any other in the film, and at full size it breaks to four. */}
          <Headline size={f.headline * 0.8}>Open an account in under a minute.</Headline>
        </Rise>

        <Rise delay={0.95} style={{ width: "100%" }}>
          <Sub>Pick a handle, and the unlock you already use. There is nothing else to set up.</Sub>
        </Rise>

        <Rise delay={1.25}>
          <span
            className="border-ink bg-go text-go-ink"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: f.subhead * 1.05,
              fontWeight: 700,
              borderWidth: 1.5,
              borderStyle: "solid",
              borderRadius: 10,
              paddingInline: f.subhead * 1.3,
              paddingBlock: f.subhead * 0.7,
              boxShadow: "0 5px 0 var(--ink)",
            }}
          >
            {url}
          </span>
        </Rise>
      </div>
    </Stage>
  );
}

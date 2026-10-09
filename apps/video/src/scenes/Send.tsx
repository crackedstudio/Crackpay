import { Check, Face } from "@crackpay/brand/icons";
import { useFormat } from "../layout.ts";
import { Headline, Kicker, Split, Stage } from "../ui/stage.tsx";
import { Pop, Rise, Stamp, usePast, useTyped } from "../ui/motion.tsx";
import { Control, MicroLabel, Phone, PhoneHeader, scaleFor } from "../ui/Phone.tsx";

/** The moment the approve button goes down, and the moment it comes back. */
const PRESS = 2.4;
const LANDED = 2.75;

/**
 * The payment, in full, in five seconds: a handle typed, an amount, a face, and
 * money gone. The cut to the receipt is hard and the receipt is stamped, because
 * on Arc finality is sub-second — there is no spinner to show and no counter to
 * watch, and pretending otherwise would be the one dishonest frame in the film.
 */
export function Send() {
  const f = useFormat();
  const s = scaleFor(f.phone);
  const recipient = useTyped("@sam", 0.55, 0.075);
  const pressed = usePast(PRESS);
  const landed = usePast(LANDED);

  return (
    <Stage>
      <Split
        text={
          <div>
            <Rise>
              <Kicker>Sending</Kicker>
            </Rise>
            <Rise delay={0.12}>
              <Headline>Type a handle. Approve with your face.</Headline>
            </Rise>
          </div>
        }
        visual={
          <Phone width={f.phone} rotate={landed ? -1.5 : 0}>
            {landed ? <Receipt s={s} /> : <Compose s={s} recipient={recipient} pressed={pressed} />}
          </Phone>
        }
      />
    </Stage>
  );
}

/** The send screen: who, how much, and the one control that moves it. */
function Compose({ s, recipient, pressed }: { s: number; recipient: string; pressed: boolean }) {
  return (
    <>
      <Rise delay={0.1}>
        <PhoneHeader s={s} />
      </Rise>

      <div style={{ marginTop: 26 * s, display: "flex", flexDirection: "column", gap: 8 * s }}>
        <MicroLabel s={s}>To</MicroLabel>
        <div
          className="border-ink bg-surface"
          style={{
            display: "flex",
            alignItems: "center",
            height: 52 * s,
            paddingLeft: 14 * s,
            borderRadius: 6 * s,
            borderWidth: 1.5 * s,
            borderStyle: "solid",
            fontSize: 20 * s,
            fontWeight: 700,
          }}
        >
          {recipient}
          {/* A caret only while there is something still to type. */}
          {recipient.length < 4 ? (
            <span className="bg-ink" style={{ width: 2 * s, height: 24 * s, marginLeft: 3 * s }} />
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 22 * s, display: "flex", flexDirection: "column", gap: 6 * s }}>
        <MicroLabel s={s}>Amount</MicroLabel>
        <Rise delay={1.35}>
          <span className="figure" style={{ fontSize: 56 * s }}>
            $40.00
          </span>
        </Rise>
      </div>

      <Rise delay={1.7} style={{ marginTop: 26 * s, display: "flex" }}>
        <Control s={s} tone="go" icon={Face} pressed={pressed} grow>
          Approve
        </Control>
      </Rise>
    </>
  );
}

/** The receipt. Stamped, because this is money landing. */
function Receipt({ s }: { s: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14 * s,
        paddingTop: 46 * s,
        paddingBottom: 46 * s,
      }}
    >
      <Stamp style={{ display: "flex", borderRadius: "9999px" }}>
        <span
          className="border-ink bg-go text-go-ink"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 76 * s,
            height: 76 * s,
            borderRadius: "9999px",
            borderWidth: 1.5 * s,
            borderStyle: "solid",
          }}
        >
          <Check style={{ width: 40 * s, height: 40 * s }} strokeWidth={2.75} />
        </span>
      </Stamp>

      <Rise delay={0.3} style={{ textAlign: "center" }}>
        <div className="figure" style={{ fontSize: 46 * s }}>
          $40.00
        </div>
      </Rise>
      <Rise delay={0.42} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17 * s, fontWeight: 600 }}>sent to @sam</div>
      </Rise>
      <Pop delay={0.62}>
        <MicroLabel s={s}>Landed · about one second</MicroLabel>
      </Pop>
    </div>
  );
}

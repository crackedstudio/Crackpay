import { useFormat } from "../layout.ts";
import { Headline, Kicker, Split, Stage } from "../ui/stage.tsx";
import { Rise, Stamp, useCountedCents } from "../ui/motion.tsx";
import { ArrowDown, ArrowUp } from "@crackpay/brand/icons";
import { BalanceBlock, Control, MicroLabel, Phone, PhoneHeader, TxRow, scaleFor } from "../ui/Phone.tsx";

/**
 * What the thing is, shown as the home screen it actually is: one balance, two
 * buttons, a list of receipts. The balance counts up and lands with the stamp,
 * because that is the moment the screen is about.
 */
export function WhatItIs() {
  const f = useFormat();
  const s = scaleFor(f.phone);
  const balance = useCountedCents(124_000, 0.45, 0.55);

  return (
    <Stage>
      <Split
        text={
          <div>
            <Rise>
              <Kicker>What it is</Kicker>
            </Rise>
            <Rise delay={0.12}>
              <Headline>A dollar account that lives on your phone.</Headline>
            </Rise>
          </div>
        }
        visual={
          <Phone width={f.phone}>
            <Rise delay={0.18}>
              <PhoneHeader s={s} />
            </Rise>

            {/* The figure lands on its rule rather than fading in, and comes to
                rest square: this one sits in the layout rather than on it. */}
            <Stamp delay={0.45} shadow={false} settle={0} style={{ transformOrigin: "left center" }}>
              <BalanceBlock s={s} label="Your balance" figure={balance} />
            </Stamp>

            <Rise delay={1.0} style={{ display: "flex", gap: 10 * s, marginTop: 16 * s }}>
              <Control s={s} tone="go" icon={ArrowDown} grow>
                Deposit
              </Control>
              <Control s={s} tone="card" icon={ArrowUp} grow>
                Withdraw
              </Control>
            </Rise>

            <div style={{ marginTop: 20 * s, display: "flex", flexDirection: "column", gap: 8 * s }}>
              <Rise delay={1.25}>
                <MicroLabel s={s} tone="ink">
                  Recent
                </MicroLabel>
              </Rise>
              <Rise delay={1.45}>
                <TxRow s={s} who="From @ada" amount="+$40.00" incoming />
              </Rise>
              <Rise delay={1.62}>
                <TxRow s={s} who="To @sam" amount="−$12.40" />
              </Rise>
            </div>
          </Phone>
        }
      />
    </Stage>
  );
}

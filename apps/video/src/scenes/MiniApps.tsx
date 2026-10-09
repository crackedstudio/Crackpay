import { Bolt, Check, Code, Grid, Link as LinkIcon, Receipt, Refresh, Shield, X } from "@crackpay/brand/icons";
import type { IconProps } from "@crackpay/brand/icons";
import type { ReactNode } from "react";
import { Sequence, useVideoConfig } from "remotion";
import { useFormat } from "../layout.ts";
import { Headline, Kicker, Split, Stage, Sub } from "../ui/stage.tsx";
import { Control, MicroLabel, Phone, scaleFor } from "../ui/Phone.tsx";
import { Pop, Rise, Sheet, Stamp, usePast } from "../ui/motion.tsx";

/*
 * Eleven of the thirty seconds, which is the point: Mini Apps are the reason the
 * wallet is a platform rather than a feature. The beat is built in three, and in
 * this order, because that is the order the objection arrives in —
 *
 *   1. there are apps inside it
 *   2. and they cannot touch your money
 *   3. and shipping one is one npm install
 *
 * Beat 2 is the load-bearing one. The whole security model is that the app runs in
 * its own frame on its own origin and CrackPay does the asking, so the film shows
 * the frame, and shows the sheet coming from outside it.
 */

/** Seconds. 2.4 + 2.8 + 2.8 + 3.0 = the scene's 11. */
export const MINIAPP_BEATS = { shelf: 2.4, kinds: 2.8, frame: 2.8, build: 3.0 } as const;

export function MiniApps() {
  const { fps } = useVideoConfig();
  const shelf = MINIAPP_BEATS.shelf * fps;
  const kinds = MINIAPP_BEATS.kinds * fps;
  const frame = MINIAPP_BEATS.frame * fps;

  return (
    <>
      <Sequence durationInFrames={shelf} premountFor={fps}>
        <Shelf />
      </Sequence>
      <Sequence from={shelf} durationInFrames={kinds} premountFor={fps}>
        <Kinds />
      </Sequence>
      <Sequence from={shelf + kinds} durationInFrames={frame} premountFor={fps}>
        <InFrame />
      </Sequence>
      <Sequence from={shelf + kinds + frame} durationInFrames={MINIAPP_BEATS.build * fps} premountFor={fps}>
        <Build />
      </Sequence>
    </>
  );
}

/* ------------------------------------------------------------------ beat one */

/**
 * The shelf. KashLink is the one named app because it is the one that is listed;
 * the rest are the categories a directory fills with, not products being claimed.
 */
const TILES: { icon: (p: IconProps) => ReactNode; name: string; tone: "go" | "surface" }[] = [
  { icon: LinkIcon, name: "KashLink", tone: "go" },
  { icon: Bolt, name: "Airtime", tone: "surface" },
  { icon: Receipt, name: "Bills", tone: "surface" },
  { icon: Shield, name: "Savings", tone: "surface" },
  { icon: Refresh, name: "Swap", tone: "surface" },
  { icon: Grid, name: "More", tone: "surface" },
];

function Shelf() {
  const f = useFormat();
  const s = scaleFor(f.phone);

  return (
    <Stage>
      <Split
        text={
          <div>
            <Rise>
              <Kicker>Mini Apps</Kicker>
            </Rise>
            <Rise delay={0.12}>
              <Headline>And a shelf of apps inside it.</Headline>
            </Rise>
          </div>
        }
        visual={
          <Phone width={f.phone}>
            <Rise delay={0.1} style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
              <Grid style={{ width: 18 * s, height: 18 * s }} />
              <MicroLabel s={s} tone="ink">
                Apps
              </MicroLabel>
            </Rise>

            <div
              style={{
                marginTop: 18 * s,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12 * s,
              }}
            >
              {TILES.map(({ icon: Icon, name, tone }, i) => (
                <Pop key={name} delay={0.3 + i * 0.09}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 * s }}>
                    <span
                      className={`border-ink ${tone === "go" ? "bg-go text-go-ink" : "bg-surface text-ink"}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 56 * s,
                        height: 56 * s,
                        borderRadius: 12 * s,
                        borderWidth: 1.5 * s,
                        borderStyle: "solid",
                        boxShadow: `${3 * s}px ${3 * s}px 0 var(--ink)`,
                      }}
                    >
                      <Icon style={{ width: 26 * s, height: 26 * s }} />
                    </span>
                    <span style={{ fontSize: 12 * s, fontWeight: 600 }}>{name}</span>
                  </div>
                </Pop>
              ))}
            </div>

            <Rise delay={1.1} style={{ marginTop: 20 * s }}>
              <MicroLabel s={s}>Paid for with your account</MicroLabel>
            </Rise>
          </Phone>
        }
      />
    </Stage>
  );
}

/* ----------------------------------------------------------------- beat two */

/**
 * What a Mini App can be. Eight words, because the shelf in beat one shows six
 * tiles and a viewer will otherwise read the category as "payments apps".
 *
 * Set as type rather than as another phone: the beats either side of this one are
 * both phone-led, and three phone shots in a row stop reading as different ideas.
 */
const KINDS = [
  "Games",
  "Rewards",
  "Tickets",
  "Airtime",
  "Bills",
  "Savings",
  "Shopping",
  "Trivia",
] as const;

function Kinds() {
  const f = useFormat();
  const chip = f.vertical ? 46 : 40;

  return (
    <Stage>
      <div style={{ display: "flex", flexDirection: "column", gap: f.vertical ? 60 : 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Rise>
            <Headline>Games, toys, and the useful stuff.</Headline>
          </Rise>
          <Rise delay={0.18}>
            <Sub>If it runs in a browser, it can run in CrackPay — and get paid in it.</Sub>
          </Rise>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: f.vertical ? 18 : 16 }}>
          {KINDS.map((kind, i) => (
            <Pop key={kind} delay={0.5 + i * 0.1}>
              <span
                className="border-ink bg-card"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: chip,
                  fontWeight: 700,
                  borderWidth: 1.5,
                  borderStyle: "solid",
                  borderRadius: 999,
                  paddingInline: chip * 0.72,
                  paddingBlock: chip * 0.38,
                  boxShadow: "4px 4px 0 var(--ink)",
                  whiteSpace: "nowrap",
                }}
              >
                {kind}
              </span>
            </Pop>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/* ---------------------------------------------------------------- beat three */

/** When the sheet is up, when the button goes down, and when it comes back. */
const SHEET_AT = 0.85;
const PRESS_AT = 1.8;
const APPROVED_AT = 2.1;

/**
 * The security model, drawn. The app's own page is boxed and labelled with its
 * origin; the CrackPay sheet rises over the whole phone, from outside that box.
 * That is literally how it works — the prompt renders in the CrackPay page and
 * never in the iframe — and it is the one thing a viewer has to believe.
 */
function InFrame() {
  const f = useFormat();
  const s = scaleFor(f.phone);
  const pressed = usePast(PRESS_AT);
  const approved = usePast(APPROVED_AT);

  return (
    <Stage>
      <Split
        text={
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Rise>
              <Headline>The app asks. CrackPay asks you.</Headline>
            </Rise>
            <Rise delay={0.2}>
              <Sub>Your keys never leave CrackPay, and no app moves a cent you have not seen and approved.</Sub>
            </Rise>
          </div>
        }
        visual={
          <Phone width={f.phone} rotate={0}>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <MicroLabel s={s} tone="ink">
                  KashLink
                </MicroLabel>
                <X style={{ width: 16 * s, height: 16 * s }} className="text-muted" />
              </div>

              {/* The Mini App's own page: its own origin, inside its own frame. */}
              <div
                className="border-hair bg-surface"
                style={{
                  marginTop: 10 * s,
                  borderWidth: 1.5 * s,
                  borderStyle: "solid",
                  borderRadius: 10 * s,
                  padding: 16 * s,
                  minHeight: 336 * s,
                }}
              >
                <MicroLabel s={s}>kashlink.app</MicroLabel>
                <div style={{ marginTop: 22 * s, display: "flex", flexDirection: "column", gap: 10 * s }}>
                  <span style={{ fontSize: 17 * s, fontWeight: 700 }}>Someone sent you a link.</span>
                  <span className="figure" style={{ fontSize: 44 * s }}>
                    $12.00
                  </span>
                  <div style={{ marginTop: 8 * s, display: "flex" }}>
                    <Control s={s} tone="card" grow>
                      Claim
                    </Control>
                  </div>
                </div>
              </div>

              {/*
               * CrackPay's own sheet, over the frame rather than in it. It bleeds
               * past the phone's padding on three sides so it reads as belonging
               * to the phone, not to the box it covers.
               */}
              <Sheet
                delay={SHEET_AT}
                className="border-ink bg-card"
                style={{
                  position: "absolute",
                  left: -18 * s,
                  right: -18 * s,
                  bottom: -18 * s,
                  borderTopWidth: 1.5 * s,
                  borderTopStyle: "solid",
                  borderTopLeftRadius: 16 * s,
                  borderTopRightRadius: 16 * s,
                  padding: 18 * s,
                  paddingBottom: 26 * s,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 9 * s }}>
                  <MicroLabel s={s}>CrackPay · approve this payment</MicroLabel>
                  <span className="figure" style={{ fontSize: 40 * s }}>
                    $12.00
                  </span>
                  <span className="label text-muted" style={{ fontSize: 10 * s }}>
                    to KashLinkEscrow
                  </span>
                  <div style={{ marginTop: 6 * s, display: "flex" }}>
                    {approved ? (
                      /* Delayed to its own mount, so the tick pops when it arrives. */
                      <Pop delay={APPROVED_AT} style={{ display: "flex", flex: "1 1 0" }}>
                        <Control s={s} tone="go" icon={Check} grow>
                          Approved
                        </Control>
                      </Pop>
                    ) : (
                      <Control s={s} tone="go" grow pressed={pressed}>
                        Approve
                      </Control>
                    )}
                  </div>
                </div>
              </Sheet>
            </div>
          </Phone>
        }
      />
    </Stage>
  );
}

/* ----------------------------------------------------------------- beat four */

/** What a developer gets, which is the whole of the user experience they cannot
 *  normally give: no wallet to connect, no app to switch to, no account to make. */
const CLAIMS = [
  "Connected the moment it loads.",
  "No connect-wallet button, ever.",
  "Your users never leave your app.",
] as const;

function Build() {
  const f = useFormat();

  return (
    <Stage>
      <Split
        text={
          <div>
            <Rise>
              <Kicker>For developers</Kicker>
            </Rise>
            <Rise delay={0.1}>
              <Headline>Put your app in front of a dollar account.</Headline>
            </Rise>
          </div>
        }
        visual={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: f.vertical ? 40 : 34,
              width: f.vertical ? f.columnMax : 700,
            }}
          >
            {/* The install line gets the stamp. It is the whole ask. */}
            <Stamp
              delay={0.4}
              className="border-ink bg-card"
              style={{
                alignSelf: "flex-start",
                maxWidth: "100%",
                borderWidth: 1.5,
                borderStyle: "solid",
                borderRadius: 10,
                paddingInline: f.vertical ? 32 : 28,
                paddingBlock: f.vertical ? 26 : 22,
              }}
            >
              <code
                className="font-mono"
                style={{ fontSize: f.vertical ? 32 : 27, fontWeight: 600, whiteSpace: "nowrap" }}
              >
                npm install @crackpay/miniapp-sdk
              </code>
            </Stamp>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {CLAIMS.map((claim, i) => (
                <Rise key={claim} delay={0.95 + i * 0.16}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <span
                      className="border-ink bg-go text-go-ink"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: f.body * 1.25,
                        height: f.body * 1.25,
                        borderRadius: "9999px",
                        borderWidth: 1.5,
                        borderStyle: "solid",
                        flexShrink: 0,
                      }}
                    >
                      <Check style={{ width: f.body * 0.72, height: f.body * 0.72 }} strokeWidth={3} />
                    </span>
                    <span style={{ fontSize: f.body * 1.1, fontWeight: 600 }}>{claim}</span>
                  </div>
                </Rise>
              ))}
            </div>

            <Rise delay={1.55} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Code style={{ width: f.kicker * 1.1, height: f.kicker * 1.1 }} className="text-muted" />
              <span className="label text-muted" style={{ fontSize: f.kicker }}>
                Docs, SDK and skills at /developers
              </span>
            </Rise>
          </div>
        }
      />
    </Stage>
  );
}

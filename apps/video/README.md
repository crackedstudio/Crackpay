# The CrackPay film

A thirty-second film about CrackPay, rendered from React with
[Remotion](https://remotion.dev). It cuts to two shapes from one set of scenes:

| Composition | Size | For |
|---|---|---|
| `Vertical` | 1080×1920 | X, Instagram, TikTok, WhatsApp status |
| `Landscape` | 1920×1080 | Site hero, YouTube, a demo screen |
| `Poster` | 1080×1920 still | Thumbnail / poster frame |

```bash
pnpm --filter video studio                 # preview and scrub
pnpm --filter video render                 # both cuts into apps/video/out/
python3 apps/video/scripts/make-audio.py   # regenerate the score and effects
```

`out/` is build output and is not committed. The audio under `public/audio/` is
generated and committed, so a render does not depend on Python.

## Why it is code

The scenes import `@crackpay/brand/tokens.css` and the brand mark itself, so the
film cannot drift from the product: a colour, a type class or the mark changes in
one place and the next render has it. The phone on screen is the landing page's
phone mock at its own 328px geometry, multiplied up — not a screenshot — so the
1.5px ink rules stay crisp at 1080p and the proportions stay honest.

Two consequences worth knowing before editing:

- **No CSS animation.** Remotion renders stills, and a CSS animation has no
  defined position at an arbitrary frame. The token sheet's `rise`, `pop`, `stamp`
  and `thud` keyframes are ported frame-by-frame in `src/ui/motion.tsx`, with the
  same durations and the same cubic-bezier. Change the stylesheet's motion and
  that file has to follow.
- **Hard cuts only.** There is not a crossfade in the film. The design system has
  no blur and nothing floating, and a dissolve is both at once.

## The cut

Thirty seconds, six beats, defined in `src/Video.tsx`.

| # | Beat | In | Length | Says |
|---|---|---|---|---|
| 1 | Hook | 0:00 | 3s | Mark, name, "Send dollars like a text." |
| 2 | What it is | 0:03 | 4s | The home screen. One balance, two buttons, receipts. |
| 3 | Sending | 0:07 | 5s | Handle typed, face approves, money landed. |
| 4 | Who can move it | 0:12 | 3s | Face or finger, no seed phrase, we cannot touch it. |
| 5 | **Mini Apps** | 0:15 | **11s** | The shelf, what can be built, the frame, the install. |
| 6 | Close | 0:26 | 4s | Open an account in under a minute. |

Mini Apps take eleven of the thirty — more than twice what sending gets — because
they are the argument that CrackPay is a place other people build on rather than
one more wallet. Everything before them is the setup: an account exists, money
moves, nobody else can touch it.

That beat is itself in four, in the order the objection arrives in
(`src/scenes/MiniApps.tsx`):

1. **The shelf** (2.4s) — there are apps inside it.
2. **What they can be** (2.8s) — games, toys and the useful stuff. Set as type
   rather than another phone, because the beats either side are both phone-led and
   three phone shots in a row stop reading as different ideas.
3. **In frame** (2.8s) — and they cannot touch your money. The load-bearing one.
4. **Build one** (3.0s) — and shipping one is a single `npm install`.

Beat 3 draws the security model literally: the Mini App's page is boxed and
labelled with its own origin, and the CrackPay sheet rises over the whole phone
from outside that box. That is how the iframe host actually works — the prompt
renders in the CrackPay page and never in the iframe — and it is the one thing a
viewer has to believe.

## Sound

There is a score and there are effects, and both are synthesised from oscillators
and noise by `scripts/make-audio.py`. Nothing is sampled or licensed, so the
soundtrack can be regenerated from source like everything else here, and no
attribution is owed to anyone.

The tune is a I–V–vi–IV in C major at 120bpm. A bar is therefore exactly two
seconds, which means the music's phrases and the film's beats line up without
drifting. The arrangement follows the cut: it holds back under the hook, comes in
with the home screen, thins out under the self-custody beat — that one is read,
not watched — lifts and adds an octave-up counter-line for Mini Apps, and lands on
the tonic under the end card.

Effects are a cue list in `src/audio.ts`, timed to the frame each animation fires
on. When a scene's timing moves, its cue has to move with it or the sound detaches
from the picture.

The film is still built to read **silently**, which is how a feed plays it. The
sound is a reward for unmuting, never a requirement.

## Narration

If a voiceover is recorded later, this is the script, timed to the beats above:

1. "This is CrackPay."
2. "A dollar account that lives on your phone. One balance, and it is yours."
3. "Type a handle, approve with your face, and it lands in about a second."
4. "No seed phrase. No company that can freeze you. Only you can move it."
5. "And a shelf of apps inside it — games, toys, and the useful stuff. They run in
   their own frame, so CrackPay keeps the keys and shows you every amount before
   you approve. For developers, that is one npm install, and users who never have
   to connect a wallet or leave your app."
6. "CrackPay. Open an account in under a minute."

## Before publishing

- **Check the Mini Apps shelf and chips.** KashLink is named because it is the one
  listed app. The six tiles in beat 1 and the eight chips in beat 2 are categories,
  not products — Discover and the submission queue are Phase 3. If any of them
  reads as a claim you are not ready to make, rename or drop it in
  `src/scenes/MiniApps.tsx`.
- **The end card's address** is the `url` prop, set once in `src/Root.tsx`. It
  reads `crackpay.xyz`. Passkeys bind to the domain for good, so if that is ever
  not the production domain, this is the string to change.

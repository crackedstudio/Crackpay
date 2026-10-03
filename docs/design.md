# CrackPay — Design & Product Guide

**Status:** describes the product as built at `v0.1.0`, October 2026.
**Audience:** a designer or design agent picking this up cold, with no access to the running app.
**Companion files:** `CLAUDE.md` (engineering rules), `docs/implementation-plan.md` (scope and phasing), `docs/miniapps.md` (Mini App platform).

---

## 0. How to use this document

Part A (§1–5) is the **product guide**: what CrackPay is, who it's for, and the rules that decide what gets built. Read it before proposing anything.

Part B (§6–14) is the **design guide**: the system exactly as it exists today — tokens, components, patterns, voice. This is a description, not an aspiration. Every value here is lifted from the code and can be grepped.

Part C (§15–17) is the **brief**: an honest audit of what's weak, what a brand identity has to solve, and the constraints any new work must respect.

**The single most important thing to understand:** this product's design discipline is *subtraction*. Almost every decision in it is about something the user does **not** see. Judge proposals by what they remove.

---

# PART A — THE PRODUCT

## 1. What CrackPay is

A self-custodial US dollar account that lives on your phone's browser.

You hold your own money. There is no bank, no account manager, no company that can freeze you. But none of that is the pitch — the pitch is:

> **Send dollars like a text.**

It is built on Arc (Circle's blockchain, where the dollar itself pays the network fees), but a user never learns that and never needs to. Technically it is a crypto wallet. Experientially it must not be one.

**Feature target:** parity with MiniPay (Opera's stablecoin wallet, ~8M users across Africa).
**Form factor:** a mobile-first web app, installable as a PWA. Not a native app. Not a browser extension.

### The three sentences on the welcome screen

These are the whole product promise, and they are load-bearing:

1. Payments land in a second, and sending is free.
2. Your face or fingerprint approves every payment.
3. No seed phrase to write down or lose.

### What the user sees vs. what exists

| Exists in the system | What the user sees |
|---|---|
| ERC-4337 smart account | "your account" |
| Passkey / WebAuthn credential | "your face or fingerprint" |
| USDC, 6 decimals, base units | "$12.40" |
| Gas, paymaster, sponsorship | "Free" |
| Arc L1, chain ID 5042002 | *nothing* |
| 0x-prefixed account address | "Account address", only in Settings and Receive |
| Seed phrase | *does not exist* |

**The word "wallet" never appears in the main flow.** Neither does "crypto", "blockchain", "chain", "gas", "token", "sign", "transaction" (we say *payment*), or any chain name. The only sanctioned escape hatch is an explicit, user-chosen "View on the Arc explorer" link in a receipt — opting *out* of the abstraction, never being dropped through it.

## 2. Who it's for

The design target is a first-time stablecoin user on a mid-range Android phone in Lagos, Nairobi or Accra, on an intermittent connection, in daylight.

Concretely, this means:

- **360px is the design width.** 460px is the hard maximum column. Build at 360–420 and let it centre.
- **Thumbs, not cursors.** 44pt minimum tap targets. Primary actions live at the bottom of the screen, never the top.
- **One-handed.** Nothing critical above the fold's upper third.
- **Daylight contrast.** The light scheme is the default and the one that has to survive outdoors.
- **Data is expensive.** No heavy imagery, no video, no font variety.
- **They have been scammed before, or know someone who has.** Trust is not assumed. It is earned per screen by showing the money consequence before asking for a confirmation.

They are not crypto-native. They will not recognise a fox, a rainbow, a hexagon, a block, a chain link, or a cube. Do not use that visual language.

## 3. Product principles

These are derived from the shipped code and its comments. They are the rubric.

### 3.1 One balance
There is exactly one number that means "your money". Never two rows, never a token list, never a sum of things. Arc's native USDC and its ERC-20 interface are *the same money*; rendering both would be a bug, not a feature. Crosschain funding is a mechanism, not a surface.

### 3.2 Say what happens to the money, first
Every confirmation, every error, every success leads with the money. Not with the mechanism.

- Review screen: the amount, then "Left after this".
- Reverted payment: *"Nothing left your balance. You still have $12.40."*
- Offline: *"Your money is safe. CrackPay needs a connection to show your balance."*
- Failed history load: *"Your money is safe — this is only the history view."*

A user's first question in any failure state is "where is my money". Answer it in the heading or the first line. Always.

### 3.3 Every outcome gets its own way out, and the exit matches the risk
A payment has three terminal states, and each gets a distinct screen with distinct actions:

| Outcome | Screen | Primary action | Why |
|---|---|---|---|
| `confirmed` | Green check, "Sent" | "Done" | It worked. Offer another payment as secondary. |
| `reverted` | Red alert, "That payment didn't go through" | "Try again" | Nothing moved. Retrying is safe. |
| `submitted_no_receipt` | Amber alert, "We couldn't confirm this" | "Check my activity" | **Retrying could pay twice.** Never offer a retry here. |

That third state exists because Arc's blocklist reverts burn gas without producing a receipt. Design must preserve this three-way split. Collapsing it into a generic "Something went wrong" is a money-losing bug wearing a UI costume.

### 3.4 Never a blank frame
Every asynchronous state has a designed stand-in. `ScreenSkeleton` holds a whole screen while we work out who the user is. Lists show shimmer rows. The Mini App host shows a launch splash. A blank page reads as a broken app, and a broken-looking money app is an uninstalled money app.

### 3.5 Green only ever means money or "go"
From `globals.css`: *"an emerald that only ever means money or 'go' — so a green thing on screen is always safe to tap."* The accent is used for: primary buttons, incoming money, success, the active tab, and allowed/free facts. It is **never** decoration. If a green thing on screen isn't safe to tap or isn't money arriving, that's a bug.

### 3.6 No sideways exits mid-flow
The tab bar appears only on the four top-level screens (Home, Activity, Apps, Settings). Anything inside a flow — send, onboarding, a Mini App — shows a back arrow instead. The user is never offered an escape hatch in the middle of a payment.

### 3.7 Finality is sub-second — design accordingly
No confirmation counters. No "pending" state beyond the network round trip. No progress bars for the chain. The success screen appears almost immediately, so it must feel earned rather than abrupt — that's what the `pop` animation on the check mark is for.

### 3.8 Back always agrees with itself
A screen's back arrow and any on-screen "go back" control read from the same prop (`Screen`'s `back`). They can never disagree. In multi-step flows, each step declares the step before it.

## 4. Hard scope boundaries

Do not design these. They are out of scope by decision, not by backlog position.

- **No fiat on-ramp.** No "buy stablecoins" flow, not even a stub. Money arrives by being received, by crosschain deposit, or by claiming a Cash Link.
- **No local-currency stablecoins** (no cNGN and similar). USDC only; EURC optional later.
- **No multi-chain asset list.** One balance, §3.1.
- **No seed phrase anywhere**, including in recovery. Recovery is passkey-based.
- **No price charts, portfolio value, or market data.** This is an account, not an exchange.
- **No native apps yet.** PWA only until stated otherwise.

## 5. Build order (where design effort pays off)

| Phase | Contents | Design status |
|---|---|---|
| 0 | Technical spikes | done, scratch deleted |
| 1 | **Core wallet** — onboarding, home, send, receive, activity, settings, PWA shell | **built, documented here** |
| 2 | Parity — Cash Links, Pockets (swap), Earn, Unified Balance funding, merchant payments | partially built; **Mini Apps shipped** |
| 3 | Mini Apps platform — iframe host, Discover, review queue | **host + store shipped** (§13) |
| 4 | Partners + mainnet — KYC tiers, offramp, card, virtual accounts | not started |

Phase 1's exit criterion is the best summary of the product's ambition: **two new users onboard and pay each other in under 60 seconds on a phone browser.**

---

# PART B — THE DESIGN SYSTEM AS BUILT

## 6. Information architecture

```
/                     Home — balance, 3 actions, recent activity     [tab]
/activity             Full history, grouped by day                   [tab]
/apps                 Mini App store                                 [tab]
/settings             Account, security, about, sign out             [tab]
  /settings/developer Hidden; 7 taps on the version row to unlock

/onboarding           4 steps (phone mode) or 2 steps (handle mode)
/signin               Returning user, passkey unlock
/send                 recipient → amount → review → sending → outcome
/receive              QR, handle, payment link, account address
/pay?to=@handle       Inbound payment link; resolves then enters /send
/apps/[id]            A Mini App, running in the host chrome
/apps/test?url=…      Developer-mode test app
/offline              Service-worker fallback
/developers           Public docs for Mini App builders
/admin/*              Internal registry management (not user-facing)
```

**Four tabs, chosen deliberately:** Home, Activity, Apps, Settings. Nothing else earns a tab.

## 7. Layout shell

Everything is built on one component, `Screen` (`src/components/ui.tsx`).

```
┌──────────────────────────────────┐
│ header  sticky top, min-h-14     │  bg-background/85 + backdrop-blur-xl
│ [back] [title | lead]  [action]  │  pt-[env(safe-area-inset-top)]
├──────────────────────────────────┤
│ main   flex-1, flex-col          │  gap-5, px-5
│        gap-5 between blocks      │  pt-2 (with bar) or safe-area (without)
│                                  │  pb-6, or pb-28 when `inset` (tab bar)
├──────────────────────────────────┤
│ footer sticky bottom             │  gradient fade from background
│        primary action            │  pb-[max(1rem, safe-area-inset-bottom)]
└──────────────────────────────────┘
```

| Prop | Meaning |
|---|---|
| `title` | App-bar heading, `text-lg font-semibold`, truncates |
| `back` | A route string **or** a handler. One source of truth for every back control on the screen. |
| `action` | Right-hand app-bar slot (e.g. the refresh button on Home) |
| `lead` | Replaces the title row entirely — used for an avatar+handle chip, or a `StepProgress` |
| `footer` | Sticky bottom block holding the primary action |
| `inset` | Adds bottom padding for the tab bar. Top-level screens only. |

- **Column:** `mx-auto w-full max-w-[460px]`.
- **Gutter:** `px-5` (20px). Horizontally-scrolling rows break out with `-mx-5 … px-5`.
- **Safe areas:** every edge respects `env(safe-area-inset-*)`; the app draws under the notch and home indicator (`viewportFit: "cover"`).
- **No page bounce:** `overscroll-behavior-y: none` on body, so an installed PWA doesn't rubber-band.

`ScreenSkeleton` is the full-screen stand-in: a title bar, a balance card, three action tiles, and list rows, all shimmering. It is what shows while the wallet provider works out whether the user is signed in.

## 8. Colour

Two schemes, one palette. **Components never hardcode a colour** — every value is a CSS custom property in `src/app/globals.css`, exposed to Tailwind through `@theme inline`.

### Light (default)

| Token | Value | Used for |
|---|---|---|
| `--background` | `#f7f7f5` | page |
| `--card` | `#ffffff` | raised surfaces, list containers |
| `--surface` | `#f1f0ed` | inset blocks, chips, quiet buttons |
| `--foreground` | `#14110f` | primary text |
| `--muted` | `#6b6560` | secondary text, icons |
| `--line` | `#e6e3df` | borders, dividers |
| `--accent` | `#047857` | money, go, success, active |
| `--accent-soft` | `#d6f5e6` | accent tint backgrounds |
| `--accent-foreground` | `#ffffff` | text on accent |
| `--danger` | `#be123c` | destructive, failure |
| `--danger-soft` | `#ffe4e6` | danger tint |
| `--warning` | `#b45309` | uncertain outcomes |
| `--warning-soft` | `#fdf1d6` | warning tint |
| `--ring` | `#14110f` | focus outline |

### Dark (`prefers-color-scheme: dark`)

| Token | Value |
|---|---|
| `--background` | `#0b0a09` |
| `--card` | `#191714` |
| `--surface` | `#231f1b` |
| `--foreground` | `#f7f7f5` |
| `--muted` | `#a39b93` |
| `--line` | `#2d2822` |
| `--accent` | `#34d399` |
| `--accent-soft` | `#0a2e22` |
| `--accent-foreground` | `#04281e` |
| `--danger` | `#fb7185` |
| `--danger-soft` | `#2d1117` |
| `--warning` | `#fbbf24` |
| `--warning-soft` | `#2b2008` |
| `--ring` | `#f7f7f5` |

### Rules

1. **Neutrals are warm, not grey.** Every neutral carries a touch of yellow/brown (`#14110f`, not `#000000`; `#f7f7f5`, not `#ffffff`). This is the one piece of existing brand character — keep it or replace it deliberately.
2. **Green is reserved** (§3.5).
3. **`warning` means "we don't know".** It is used for exactly one thing today: the unconfirmed payment. Don't dilute it into a general "caution" colour.
4. **Tint pairs.** Every status colour has a `-soft` partner for backgrounds; status text sits on its own soft tint, never on raw card.
5. **Two shadows only:** `--shadow-card` (resting) and `--shadow-lift` (sheets, floating things). No other elevation exists.
6. **Any new colour must be added to both schemes** in `globals.css` and to the `@theme inline` block. A raw hex in a component is a defect.

### Known weakness
`#047857` is Tailwind's stock `emerald-700`. It is competent and completely anonymous. See §15.

## 9. Typography

**Faces:** Geist Sans (body, UI) and Geist Mono (`--font-geist-mono`, used only for raw addresses in test-app contexts). Loaded via `next/font/google`.

### The `.numeric` class — important
```css
.numeric { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
```
**Every figure that can change applies it**: the balance, amounts, the OTP code boxes, activity amounts, receipt values. Money must not jitter as digits change. This is non-negotiable in any redesign.

### Scale in use

| Role | Class | Where |
|---|---|---|
| Hero | `text-[2.5rem] leading-[1.05] tracking-tight` | Welcome: "Send dollars like a text." |
| Balance | `text-[3.25rem] font-semibold leading-none` | Home balance card; send review amount |
| Amount entry | `text-[4rem]` → `text-5xl` → `text-4xl` | Shrinks as the figure grows, so it never wraps |
| Success heading | `text-3xl font-semibold tracking-tight` | "Sent", "You're all set" |
| Handle display | `text-3xl font-semibold tracking-tight` | Receive screen |
| Onboarding question | `text-[1.75rem] leading-tight tracking-tight` | "What's your number?" |
| Failure heading | `text-2xl font-semibold` | "That payment didn't go through" |
| App bar / sheet title | `text-lg font-semibold` | `Screen` title, `Sheet` title |
| Body | `text-base` (16px) | default |
| Secondary | `text-sm text-muted` | captions, descriptions |
| Section label | `text-xs font-semibold uppercase tracking-wide text-muted` | "YOUR ACCOUNT", "RECENT", "MONEY" |
| Tab label | `text-[0.6875rem] font-medium` | tab bar |
| Micro | `text-xs text-muted` | host names, footnotes |

### Rules
- **Sentence case everywhere.** The only uppercase is the section label style above.
- **Two weights:** `font-medium` (500) and `font-semibold` (600). No bold, no light.
- **`tracking-tight` on anything ≥ `text-2xl`.** Large text in Geist needs it.
- **Truncate, don't wrap, in chrome.** Titles, handles and host names use `truncate`; descriptions use `line-clamp-2`.

## 10. Shape, spacing, motion

### Radii
| Value | Used for |
|---|---|
| `rounded-full` | all buttons, pills, chips, tap targets, avatars, skeletons |
| `rounded-3xl` (24px) | cards, action tiles |
| `rounded-2xl` (16px) | inner blocks, fields, keypad keys, callouts, fact tables |
| `rounded-[1.75rem]` | sheet top corners |
| `rounded-[0.625 / 0.875 / 1.125rem]` | app icons, sm/md/lg — squircles, see §12 |

**Circles mean people. Rounded squares mean apps.** `Avatar` is `rounded-full`; `AppIcon` is a squircle. This distinction is deliberate and should survive any redesign.

### Spacing
- Block rhythm inside a screen: `gap-5` (20px).
- Inside a card: `p-4` or `p-5`; list rows are `py-4` (stacked) / `py-3.5` (inline).
- Icon-in-tile: `h-10 w-10 rounded-xl` (onboarding lists) or `h-12 w-12 rounded-2xl` (empty states).
- Tap targets: `h-11 w-11` minimum (44pt), `h-14` for primary buttons.

### Motion
```css
--animate-rise:     rise 0.22s cubic-bezier(0.22, 1, 0.36, 1);  /* sheets: 14px up + fade */
--animate-fade:     fade 0.18s ease-out;                        /* callouts, overlays */
--animate-pop:      pop 0.4s cubic-bezier(0.22, 1, 0.36, 1);    /* success checks: 0.6→1.06→1 */
--animate-shimmer:  shimmer 1.4s ease-in-out infinite;          /* skeletons: 0.45↔0.8 opacity */
```
- `.pressable` gives `scale(0.97)` on `:active` over 0.1s, and kills the tap highlight. Applied to every interactive surface. The feel is *physical press*, not *hover*.
- **`prefers-reduced-motion: reduce` collapses everything to 0.01ms.** Already implemented globally. Any new animation must survive this.
- The easing `cubic-bezier(0.22, 1, 0.36, 1)` is the house curve — a fast, confident settle.

### Focus
`:focus-visible` draws a 2px `--ring` outline at 2px offset. Inputs suppress their own outline and show focus through the field wrapper instead (so the ring follows the rounding).

## 11. Component inventory

All in `src/components/`. `ui.tsx` is the primitive library.

### Primitives (`ui.tsx`)

| Component | Notes |
|---|---|
| `Button` | 5 variants × 2 sizes. Full width by default. `loading` shows a spinner without changing label width. |
| `LinkButton` | Same visual contract, renders a `next/link`. |
| `IconButton` | 44pt round target. **`label` is required** — it is the accessible name. |
| `Spinner` | 24-box SVG, `animate-spin`, `currentColor`. |
| `TextField` | Label above, 56px field, optional `prefix` (the "@" on a handle) and `hint` tinted by `status: "ok" \| "error"`. Focus ring on the wrapper. |
| `Callout` | Tinted block for one piece of news. Tones: `info` (surface), `error` (danger-soft), `success` (accent-soft). `role="alert"` when error. |
| `ErrorText` | `Callout tone="error"`. Renders nothing when its child is falsy, so you can pass state directly. |
| `Card` | `rounded-3xl border-line bg-card`. Lists inside use `divide-y divide-line`. |
| `ListRow` | Two layouts: **`stacked`** (quiet label over prominent value — a handle, an address) and **`inline`** (label left, value right — a fee, a date, "left after"). Renders as link, button or div depending on props. |
| `SwitchRow` | Phone-settings-style toggle row. |
| `Skeleton` | `animate-shimmer` pill. |
| `EmptyState` | Icon tile + title + body + optional action. The standard "nothing here yet". |
| `StepProgress` | Dots; the completed ones stretch to `w-5` in accent. |
| `Screen` / `ScreenSkeleton` | §7. |

**Button variants**

| Variant | Appearance | Use |
|---|---|---|
| `primary` | accent fill, `accent-foreground` text, `shadow-card` | the one action the screen is for |
| `secondary` | card fill, `line` border | the alternative |
| `subtle` | surface fill | tertiary, in-content |
| `ghost` | muted text only | "Cancel", "I'm new here" |
| `danger` | `danger-soft` fill, `danger` text | sign out, destructive confirmations |

Sizes: `lg` = `h-14` (56px, screen footers), `md` = `h-11` (44px, in content).

### Composed components

| Component | What it is |
|---|---|
| `Sheet` | Bottom panel. `animate-rise`, blurred scrim, `rounded-t-[1.75rem]`, locks body scroll, Escape closes. Used for receipts, confirmations, sign-out, Mini App approvals. |
| `Toast` | One line, bottom, gone in 2.2s. `bg-foreground text-background` pill. For actions that succeed invisibly — a copy, a share. Provided app-wide by `ToastProvider`. |
| `TabBar` | Fixed bottom nav, 4 tabs, `bg-card/90 backdrop-blur-xl`, active tab in accent. |
| `Avatar` | Deterministic HSL hue from a seed string, up to two initials, three sizes. Circle. |
| `AppIcon` | Mini App tile. Remote icon with `onError` fallback to a lettered squircle in a deterministic hue. Three sizes. |
| `AmountPad` | The amount-entry screen: a figure that shrinks as it grows, a caption/problem line, optional shortcut chips ($5/$10/$20/Max), and a 3×4 keypad of `h-16` keys. Also binds a physical keyboard. |
| `CodeInput` | Six boxes for the SMS code — actually **one** hidden input with the digits drawn on top, so OS autofill and paste both work. The cursor box is outlined in accent. |
| `CopyRow` | A `ListRow` whose whole row copies. Swaps the copy icon for an accent check for 1.6s and fires a toast. |
| `QrCode` | Always `#000` on `#fff` regardless of theme — cameras need the contrast. `max-w-[240px]`. |
| `ReceiptSheet` | The detail behind an activity row, **in-app**. Shows exact amount when it differs from the rounded display, date, "Network fee: Free", copyable tx hash, and an explorer link as a *choice*. |
| `ActivityList` | Grouped by day with "Today"/"Yesterday"/date headings. Each row: avatar with a direction badge, counterparty, time, signed amount (incoming in accent with `+`). Skeleton, empty and failed states built in. |
| `MiniAppList` | The Apps store: category chips, "Jump back in" tile row, category sections, and a standing shield note. §13. |
| `MiniAppHost` | The chrome around a running Mini App. §13. |
| `InstallPrompt` | Dismiss-for-good PWA nudge. Platform-aware (Chromium prompt vs iOS Share-sheet instructions). Never shown inside a flow or once installed. |
| `RequireAccount` | Guard. Renders `ScreenSkeleton` while deciding, then children, or redirects carrying the intended destination as `?next=`. |

### Icon set
`src/components/icons.tsx` — 24 icons, all inline, all 24×24, `stroke-width: 1.75`, `currentColor`, `fill: none`, round caps and joins. Decorative (`aria-hidden`) unless given a `title`.

`ArrowUp · ArrowDown · ArrowLeft · ChevronRight · Home · Clock · Grid · Gear · Check · Copy · Share · Backspace · Plus · Refresh · Alert · Info · Face · Bolt · Shield · Link · Wallet · X · Receipt · External · Code`

**Semantic assignments that must not drift:** `Face` = passkey/biometric approval. `Shield` = safety claim. `Bolt` = speed. `Check` = success. `Alert` = both failure (danger) and uncertainty (warning) — the colour carries the distinction.

## 12. Money: display rules

This is the one area where a design decision can cost a user real money. Read it.

- **Internally money is always a `bigint` in 6-decimal base units.** A `number` holding an amount is a bug. All conversion lives in `src/lib/money.ts`.
- **Arc has two decimal scales**: native USDC (the gas balance) is 18 decimals, the ERC-20 interface is 6. Only `money.ts` and the RPC boundary ever know this. Nothing in the design layer should.
- `dollars(base)` → `"$1,234.56"` — the rounded display figure. This is what appears on screen.
- `formatAmountExact(base)` → every unit that actually moved. Appears only on the receipt, and only when it differs from the rounded figure (the `ReceiptSheet` checks).
- **Always `.numeric`.** Tabular figures, `-0.02em` tracking.
- **Signed amounts in activity:** `+` for incoming (accent), `−` (U+2212 minus, not a hyphen) for outgoing (foreground).
- **"Free" is a value, not a badge.** Network fee rows render the literal string `Free` as the row's value, in the same type as any other fact.
- Amount entry is validated live, with the problem replacing the caption in `danger`: *"You only have $12.40."* / *"Use at most 6 decimal places."* / *"Enter an amount above zero."*

## 13. The Mini Apps surface

The newest and least settled part of the product. A Mini App is a third-party web app that runs in a sandboxed iframe inside CrackPay and can ask to spend from the user's balance. It never sees the passkey.

### The store (`/apps`, `MiniAppList`)
- Category chips (`All`, `Money`, `Tools`, `Games`, …) — shown only when more than one category is present.
- **"Jump back in"** — a horizontally scrolling row of `lg` app icons for the apps this browser opened most recently (localStorage, max 4). Hidden when it would just repeat the whole list.
- Category sections, each a `text-xs uppercase` label over a stack of rows.
- Each row: `AppIcon` (48px) · name (semibold) · tagline (`line-clamp-2`, muted) · publisher (`text-xs`) · chevron.
- A standing shield note at the bottom: *"Apps run inside CrackPay and spend from your one balance. They ask you first every time, and none of them can see your passkey."*

### The host (`/apps/[id]`, `MiniAppHost`)
The chrome has one job: **make it unmistakable that CrackPay is still in control.**

```
┌────────────────────────────────────────────┐
│ ←  KashLink              $12.40   (i)      │  host bar: name over host,
│    arc.kashlink.live                       │  live balance, about button
├────────────────────────────────────────────┤
│ ⚠ Test app · not reviewed by CrackPay      │  only in Developer mode
├────────────────────────────────────────────┤
│                                            │
│           [ app icon, popping ]            │  launch splash, until the
│                KashLink                    │  app's page paints or its
│             Cracked Studios                │  SDK says hello
│                ⟳ Opening…                  │
│                                            │
│         🛡 Runs inside CrackPay            │
└────────────────────────────────────────────┘
```

- **Launch splash** — the app's icon, name and publisher while its page loads, then a 200ms opacity fade to the live frame. Replaces what used to be a blank white rectangle.
- **Stall recovery** — after 10 seconds: *"This is taking longer than it should. The app may be down, or it may not allow CrackPay to open it."* with "Try again" (remounts the frame) and a way back.
- **Live balance in the bar** — the single clearest signal that the app is spending *your* money. Polls every 8s.
- **About sheet** — icon, publisher, category, website, "Paying as @handle", "Network fee: Free", three capability lines (asks first / can't see your passkey / which tokens it may spend), plus Reload and Close.
- **Confirmation sheet** — titled for what it actually does: "Confirm payment" / "Allow spending" / "Confirm action". Shows an app chip (icon + name + **host**, which is the one thing the app can't fake), the amount, then a fact table: Network fee `Free`, Your balance, Left after. Over-balance requests are blocked with an explanation rather than failing on-chain.
- **Success moment** — a popping accent check with "Sent $2.50", held 1.7s, so CrackPay gets the last word on money leaving rather than deferring to whatever the app shows.
- **Test apps keep their chrome.** The Developer-mode warning is a thin strip *below* the normal bar, not a replacement for it. In a test app the recipient is shown as a raw monospace address, never a name — nobody has verified that the name is its own.
- **Leaving an app is a full page load**, because the `frame-src` permission for that app's origin is a header on that document.

## 14. Voice and copy

The voice is **a competent friend explaining money**. Calm, short, specific, never cute, never corporate, never apologetic.

### Rules
1. **Second person, present tense.** "Your money is safe", not "Funds are secure".
2. **Lead with the money consequence** (§3.2).
3. **Never blame the user.** "That payment didn't go through", not "You entered an invalid amount".
4. **Be specific with numbers.** "You only have $12.40", not "Insufficient balance".
5. **Sentence case.** Headings, buttons, labels — everything except the uppercase section label style.
6. **No jargon.** Not: wallet, crypto, blockchain, chain, gas, token, sign, transaction, address (except the two places it's unavoidable), seed phrase (except to say there isn't one), on-chain, L1, smart account, userOp, bundler, paymaster.
7. **Buttons name the outcome, not the mechanism.** "Send $12.40", "Create my account", "Share my payment link" — not "Submit", "Confirm", "OK".
8. **Errors end with a way forward.** Every failure screen has a primary action.
9. **Say what the user's phone will do before it does it.** *"Your phone will ask you to approve this"* under the send button; *"Your phone will ask to save a passkey for CrackPay"* under create-account.

### Real examples to match

| Situation | Copy |
|---|---|
| Welcome hero | Send dollars like a text. |
| Welcome subhead | A dollar account that lives on your phone. |
| Passkey pitch | CrackPay has no password and no seed phrase. Your phone's own lock screen approves everything. |
| Paying yourself | That's you. Pick someone else to pay. |
| Over balance | You only have $12.40. |
| Send success | **Sent** · $12.40 to @sam |
| Send reverted | **That payment didn't go through** · Nothing left your balance. You still have $12.40. |
| Send unconfirmed | **We couldn't confirm this** · The payment was sent but the network never confirmed it, so we don't know whether it landed. Check your activity and balance before sending again — otherwise you could pay @sam twice. |
| Offline | **You're offline** · Your money is safe. CrackPay needs a connection to show your balance and send a payment. |
| Activity failed | **Couldn't load activity** · Your money is safe — this is only the history view. |
| Empty activity | **No payments yet** · Money you send and receive shows up here, with a receipt for each one. |
| Sign out | Your money stays in your account — signing out only removes it from this browser. |
| Funding warning | Paying yourself in from another app or an exchange? Use the account address, and send **USDC on Arc**. Anything else will not arrive. |
| Onboarding done | **You're all set** · You can be paid at @sadiq |

### Anti-patterns found elsewhere, banned here
- "Oops!", "Uh oh", "Something went wrong"
- Exclamation marks (there are none in the product)
- "Please", "Sorry", "Unfortunately"
- Emoji in product copy
- "Simply", "just", "easily"
- Any sentence that explains the blockchain

---

# PART C — WHERE TO TAKE IT

## 15. Honest audit of the current design

What's genuinely good, and should be protected:

- **The restraint.** Four tabs, one balance, two type weights, two shadows, one accent. Almost nothing is decorative.
- **The failure states.** The three-way payment outcome split with risk-matched exits is better than most shipped fintech.
- **The copy.** Specific, calm, money-first. It is the strongest asset the product has.
- **Warm neutrals.** `#14110f` over `#000000` is a real, if quiet, point of view.
- **Money typography.** Tabular figures everywhere, size-adaptive amount entry.
- **The `.pressable` feel.** A physical 0.97 press is right for a thumb-first app.

What's weak:

1. **There is no brand.** The app icon (`public/icon-192.png`, `icon-512.png`) is a **flat near-black square**. There is no logo, no wordmark, no logotype. The only mark anywhere is a `C` in a rounded accent square on the welcome screen.
2. **The accent is stock.** `#047857` is Tailwind `emerald-700`. `#34d399` is `emerald-400`. Nothing distinguishes this from any other 2024-era fintech template.
3. **The typeface is unbranded.** Geist is excellent and entirely neutral — it is Vercel's default, and reads as "a developer chose this".
4. **`theme_color` equals `background_color`** (`#f7f7f5`). The PWA has no colour identity in the OS task switcher or splash.
5. **Empty states have no personality.** Every one is a muted icon in a `h-12 w-12` rounded square. There is no illustration system, no mascot, no voice in the visuals to match the voice in the words.
6. **Avatars are a hash-to-HSL.** `hsl(hash 52% 42%)` sweeps the entire wheel, so some people get muddy olive and others get lurid magenta. There's no curated palette.
7. **Dark mode has no character of its own.** It is a competent inversion of the light scheme, nothing more.
8. **Motion has no identity.** `rise`, `fade`, `pop`, `shimmer` are correct and generic. Nothing about how things move says CrackPay.
9. **No desktop or tablet treatment.** Above 460px the app is a narrow column on a flat field of `--background`. Acceptable, but an unclaimed surface.
10. **The QR code is unbranded** black-on-white — the one screen a user physically shows another person.
11. **No haptics, no sound.** A payment landing is the emotional peak of the product and it is silent.
12. **Home is conventional.** Balance card → three tiles → activity list. It works and it is forgettable. The one screen users open daily has no moment.
13. **The Mini App splash is an unclaimed handoff.** It is currently the app's own icon on a plain background; it is the natural place for a "CrackPay is handing you over" gesture.

## 16. Brief for the brand identity

### What the brand has to do
1. Make a stablecoin wallet feel like **a dollar account**, not a crypto product.
2. Signal **safety without sobriety** — trustworthy, not a bank's beige.
3. Survive being **chrome around someone else's app** (§13). The identity has to be quiet enough that a Mini App inside the frame doesn't fight it.
4. Work **at 360px, in daylight, on a cheap screen**.
5. Travel across **West and East African markets** without reading as foreign or as aid-sector.
6. Read well when it's **one letter in a 32px square** (app icon, avatars, the Apps store fallback tile).

### Deliverables needed
- **Logomark** — must work as the PWA icon at 192 and 512, maskable, and as a 32px favicon. It currently does not exist.
- **Wordmark / logotype** for the welcome screen, the developer docs, and anywhere CrackPay signs its own name.
- **Colour direction** — a replacement for the stock emerald, *plus* its soft tint, its foreground, and dark-scheme counterparts. See the constraints below.
- **Typeface decision** — keep Geist, or replace it. If replaced, it must have true tabular figures and a licence that permits self-hosting.
- **Avatar palette** — a curated set (8–12 hues) replacing the raw HSL sweep, for `Avatar` and `AppIcon` fallbacks.
- **Empty-state / illustration system** — a consistent treatment for the six empty and failure states already in the app.
- **Motion signature** — one gesture that is recognisably CrackPay. The success check is the obvious candidate.
- **Branded QR frame** for the Receive screen.
- **PWA splash + `theme_color`** that aren't the background colour.
- **Sound and haptic** for payment sent / payment received (optional, but it is the emotional peak).

### Non-negotiable constraints on any brand work

| Constraint | Why |
|---|---|
| Every colour becomes a token in `globals.css`, defined in **both** schemes | §8 rule 6 |
| If the brand colour is green, it may **only** mean money or "go" | §3.5 |
| Text contrast must meet **WCAG AA** in both schemes, in daylight | §2 |
| Figures stay tabular | §12 |
| Circles mean people, squircles mean apps | §10 |
| No crypto iconography — no chains, blocks, hexagons, cubes, foxes | §2 |
| No seed-phrase, key, vault or safe imagery | §1 |
| Every animation must survive `prefers-reduced-motion` | §10 |
| Nothing may add a runtime dependency — SVG inline, fonts via `next/font` | `CLAUDE.md` stack table |
| Assets must be light; this ships to metered connections | §2 |

### Questions the brand work should answer
- Is CrackPay a **product name** or a **place**? ("on CrackPay" is used throughout — it reads as a place.)
- What is the one gesture or shape that is ours?
- What does a CrackPay payment *sound and feel* like when it lands?
- How does the identity behave when it's the frame around a third party?

## 17. Working in this codebase

### Where things live
```
apps/web/src/
  app/globals.css          ← ALL colour, motion and base-style tokens
  app/layout.tsx           ← fonts, metadata, viewport, theme-color
  app/manifest.ts          ← PWA name, icons, theme/background colour, shortcuts
  components/ui.tsx        ← every primitive
  components/icons.tsx     ← the whole icon set, inline
  components/<Name>.tsx    ← composed components (§11)
  app/<route>/page.tsx     ← screens
  lib/money.ts             ← ALL decimal conversion. Nothing else converts.
  lib/format.ts            ← dollars(), shortAddress(), errorText()
apps/web/public/
  icon-192.png icon-512.png ← currently placeholder black squares
```

### Rules for changing the design
1. **No raw colours in components.** Add a token to `globals.css` (both schemes) and the `@theme inline` block.
2. **No new dependency** without checking the stack table in `CLAUDE.md`. No icon library, no animation library, no component library.
3. **Money stays `bigint`.** Format only at render, via `lib/money.ts`.
4. **Reuse the primitives.** If a screen needs a new shape, add it to `ui.tsx` rather than inventing it locally.
5. **New section headings use** `text-xs font-semibold uppercase tracking-wide text-muted`.
6. **Every new async surface needs a loading, empty and failed state** before it is done.
7. **Check it at 360px.** Then at 460. Then in dark mode. Then with reduced motion.

### Before declaring anything done
```bash
pnpm typecheck && pnpm lint && pnpm test
```
TypeScript is strict; `any` and non-null assertions on chain data are rejected. ESLint forbids `setState` inside effects — client-only values (localStorage, `matchMedia`) are read through `useSyncExternalStore`, as in `MiniAppList` and the Settings version row.

### One constraint that outranks design
**Passkeys are bound to the domain they were created on.** Changing the production domain invalidates every existing credential and locks every user out. Any work that touches hosting, domains or subdomains must be checked against `CLAUDE.md`'s passkey section first.

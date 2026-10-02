# UI and container

Your app runs in a frame inside CrackPay's page. This page covers what that
frame allows and how to design for it.

## Size

CrackPay is phone-first. Your frame is a single column:

- **Width:** the screen width on a phone, capped at **420 px** on larger screens.
- **Design for 360 px wide.** No horizontal scrolling.
- **Height:** the space under CrackPay's header. It changes when the keyboard
  opens. Use `min-height` and let content scroll; do not assume a fixed height.

## Let CrackPay frame you

Your server must allow framing by CrackPay.

- Do not send `X-Frame-Options`.
- If you use `Content-Security-Policy: frame-ancestors`, list CrackPay:
  `frame-ancestors https://crackpay.vercel.app`. This is also the right way to
  stop anyone else from framing your app.

## What the frame allows

Your frame runs with `sandbox="allow-scripts allow-forms allow-popups allow-same-origin"`.

| Works | Does not work |
|---|---|
| JavaScript, forms, `fetch` to your own API | Navigating the top page away from CrackPay |
| `localStorage` and IndexedDB for your origin | Camera, microphone, location |
| Copying to the clipboard | Passkeys or WebAuthn inside your app |
| Links with `target="_blank"`, which open a new tab | Third-party cookies in most browsers |

## Storage and sessions

Browsers partition a frame's storage by the site that embeds it. Data your app
stores while inside CrackPay is separate from data it stores when opened
directly in a tab. Do not expect a session from one to exist in the other.

For the same reason, cookie-based login usually fails inside a frame. Identify
the user by their account address, and keep any session token in
`localStorage` or in memory.

## Navigation

- Use your framework's router for screens inside your app.
- Links to other sites should open a new tab: `target="_blank" rel="noreferrer"`.
- CrackPay provides the way back to the wallet. You do not need a "close" button.

## Opening your app at a specific place

CrackPay passes its own URL fragment to your app. A link to
`https://crackpay.vercel.app/apps/<your-id>#invoice=42` loads your app at
`https://your-app.example/#invoice=42`. Read `location.hash` on load.

## Look and feel

- No required theme. Support `prefers-color-scheme: dark` if you can; many
  CrackPay users are in dark mode.
- Touch targets at least 44 × 44 px. Body text at least 16 px.
- Show a loading state within a second. Some users are on slow connections.
- Show amounts in dollars with two decimals, as CrackPay does.
- Do not copy CrackPay's branding. It must be obvious the app is yours.

---
name: test-crackpay-miniapp
description: Test and debug a Mini App inside CrackPay using Developer mode. Covers turning Developer mode on, loading a test page, which URLs work (deployments, domains, ngrok or Cloudflare tunnels, HTTPS on the local network), framing headers, and a troubleshooting guide for a blank frame, a provider that resolves to null, and rejected transactions. Use when the user wants to run, try, preview, test or debug a CrackPay Mini App, asks why it is blank or not connecting inside CrackPay, or mentions CrackPay Developer mode, Load test page, or ngrok with CrackPay.
---

# Test a Mini App in CrackPay

A Mini App has no wallet in an ordinary browser tab. Test it inside CrackPay with
Developer mode, which loads any URL as an unreviewed "test app".

The steps below need the user's CrackPay account and passkey. Give them the
steps; do not attempt them yourself.

## 1. Make the app reachable over HTTPS

CrackPay is a secure page and browsers will not put an `http://` page inside it.

| Where the app is | URL to use |
|---|---|
| Deployed (Vercel, Netlify, …) | The deployment URL. Preview deployments work. |
| Own domain | `https://app.example.com` |
| Local dev server, through a tunnel | The tunnel's HTTPS URL. Simplest for phones. |
| Local network | The dev server's HTTPS network address; see below. |
| Same computer as the browser | `http://localhost:<port>` is the one HTTP exception. |

### Tunnel a local dev server

```bash
npm run dev          # note the port, e.g. 5173
ngrok http 5173      # use the https://….ngrok-free.dev Forwarding URL
```

Cloudflare works too: `cloudflared tunnel --url http://localhost:5173`.

With Vite, allow the tunnel host or requests are blocked:

```ts
// vite.config.ts
export default defineConfig({
  server: { allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app", ".trycloudflare.com"] },
});
```

### Local network without a tunnel

The dev server must serve HTTPS.

- Vite: add `@vitejs/plugin-basic-ssl` and run `vite --host`.
- Next.js: `next dev --experimental-https -H 0.0.0.0`.

On the test device, open the network address (`https://192.168.1.20:5173`) once
in a normal tab and accept the certificate warning. Until then the frame stays
blank. Both devices must be on the same network. If this is troublesome, use a
tunnel.

## 2. Allow CrackPay to frame the app

- Send no `X-Frame-Options` header.
- If a `Content-Security-Policy` sets `frame-ancestors`, include
  `https://crackpay.vercel.app`.

Hosting defaults are usually fine. Frameworks and security middleware
(`helmet`, some Next.js header configs) often add `X-Frame-Options: DENY`.

## 3. Turn on Developer mode

In CrackPay at `https://crackpay.vercel.app`:

1. Open **Settings**.
2. Tap the **Version** row seven times. **Developer settings** appears.
3. Open it and switch **Developer mode** on.

Remembered per browser.

## 4. Load the app

1. In **Developer settings**, paste the URL under **Load test page**.
2. Tap **Load**.

The app opens under a red "Test app · not reviewed" bar, connected to the user's
wallet. CrackPay at www.crackpay.xyz runs on Arc mainnet, so payments move real
USDC: test with small amounts, and check your contracts on Arc Testnet first.
The account needs USDC sent to its address (Receive → Account address).

## Test apps versus listed apps

| | Test app | Listed app |
|---|---|---|
| May call | Any contract | Only contracts in its listing |
| Confirmation shows | The raw contract address and a warning | The app's name |
| Who can open it | Whoever enabled Developer mode and typed the URL | Every CrackPay user |

Test with the contracts the app will list, and follow the listed-app rules in
`send-crackpay-transactions`. A call that only works because test apps are
unrestricted will fail after listing.

## Debugging

The app is a frame in a normal browser. Open developer tools and pick the app's
frame in the console's context selector. On a phone, use Chrome remote debugging
or Safari Web Inspector.

| Symptom | Cause | Fix |
|---|---|---|
| Blank frame | The server refuses framing | Remove `X-Frame-Options`; fix `frame-ancestors` |
| Blank frame, local network URL | Certificate not accepted on this device | Open the URL in a tab and accept it |
| "That address is not secure" | An `http://` URL | Use HTTPS: deployment, tunnel or dev-server HTTPS |
| "Blocked request" (Vite) | Tunnel host not allowed | Add it to `server.allowedHosts` |
| Provider is `null` inside CrackPay | The SDK does not trust this CrackPay host | The package trusts `https://crackpay.vercel.app`. For another host pass `hostOrigins`. With the script tag, load it from the CrackPay being tested. |
| Provider is `null`, app shows its "open in CrackPay" message | The app was opened in a tab, not through Load test page | Load it through Developer mode |
| Stuck on "connecting" | Wallet code runs before the provider resolves, or reads `window.ethereum` at load | Await `getCrackPayProvider()` / use `useCrackPay()` |
| Error `4100` | Listed app calling outside its listing, or a forbidden token call | See `send-crackpay-transactions` |
| Error `4200` | Unsupported method, often signing | Remove it; see `use-crackpay-sdk` |
| Amount off by 10^12 | 6-decimal and 18-decimal USDC mixed up | See `send-crackpay-transactions` |
| "Not enough" on a tiny payment | The account has no testnet USDC | Fund it from the faucet |
| Login lost between a tab and CrackPay | Browsers partition a frame's storage | Expected. Identify users by account address. |

## What to check before calling it tested

- [ ] Loads in Developer mode with no blank frame
- [ ] Connects with no button and shows the right account
- [ ] The balance shown matches CrackPay's
- [ ] A payment shows CrackPay's confirmation with the correct amount
- [ ] Cancelling the confirmation shows a "cancelled" state, not an error
- [ ] Opened in a normal tab, it shows the "open in CrackPay" message
- [ ] Usable on a phone-width screen

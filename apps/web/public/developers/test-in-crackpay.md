# Test your Mini App in CrackPay

Developer mode loads any URL as a Mini App, so you can test before your app is
reviewed or listed. It works the way MiniPay's does.

## Turn on Developer mode

1. Open CrackPay at `https://crackpay.vercel.app` and sign in.
2. Go to **Settings**.
3. Tap the **Version** row seven times. A **Developer settings** row appears.
4. Open **Developer settings** and switch **Developer mode** on.

This is remembered per browser. CrackPay runs on Arc Testnet, so everything you
test uses testnet USDC from `https://faucet.circle.com`.

## Load your app

1. In **Developer settings**, enter your app's URL under **Load test page**.
2. Tap **Load**.

Your app opens inside CrackPay with a red "Test app · not reviewed" bar. The
wallet is connected exactly as it will be once you are listed.

## Which addresses work

Your app must be reachable at a public **HTTPS** address. Any of these work:

| Where your app is | What to paste |
|---|---|
| Deployed on Vercel, Netlify or similar | The deployment URL, for example `https://my-app.vercel.app`. Preview deployments work too. |
| On your own domain | `https://app.example.com` |
| On your computer, through a tunnel | The tunnel's HTTPS URL, for example `https://ab12.ngrok-free.dev` |
| On your local network | The HTTPS network address of your dev server, for example `https://192.168.1.20:5173`. See below. |

An `http://` address will not load, because CrackPay is a secure page and
browsers refuse to put an insecure page inside it. The one exception is
`http://localhost:<port>`, which works when your app runs on the same computer
you are browsing CrackPay from.

## Testing a local dev server through a tunnel

Expose your dev server through a tunnel and load the tunnel's HTTPS URL. This
is the simplest way to test on a phone.

```bash
npm run dev            # say it listens on port 5173
ngrok http 5173        # copy the https://….ngrok-free.dev Forwarding URL
```

Paste that URL into **Load test page**. [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
works the same way.

**"Blocked request" with Vite?** Allow the tunnel's host:

```ts
// vite.config.ts
export default defineConfig({
  server: { allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app"] },
});
```

## Testing over your local network

To use your dev server's network address directly, it has to serve HTTPS.

1. Turn on HTTPS in your dev server. With Vite, add
   [`@vitejs/plugin-basic-ssl`](https://github.com/vitejs/vite-plugin-basic-ssl)
   and run `vite --host`. With Next.js, run `next dev --experimental-https -H 0.0.0.0`.
2. On the phone or computer you test with, open the network address
   (`https://192.168.1.20:5173`) once in a normal tab and accept the
   certificate warning. Until you do, the frame stays blank.
3. Paste the same address into **Load test page**.

Both devices must be on the same network. If this gives you trouble, use a
tunnel instead.

## What is different for a test app

| | Test app | Listed app |
|---|---|---|
| Contracts it may call | Any | Only those approved in its listing |
| Confirmation prompt | Shows the raw contract address and a warning | Shows your app's name |
| Who can open it | Only someone who turned on Developer mode and typed the URL | Every CrackPay user |

Because a test app is unrestricted, test with the contracts you intend to list.
A call that works in testing will be refused after listing if its contract is
not in your listing.

## Debugging

- **Console.** Your app is a frame in a normal browser. Open the browser's
  developer tools and select your frame in the console's context menu. On a
  phone, use Chrome remote debugging or Safari Web Inspector.
- **`getCrackPayProvider()` resolves to `null`.** Your page is not inside
  CrackPay, or it is inside a CrackPay the SDK does not trust. The package trusts
  `https://crackpay.vercel.app`; for any other host pass `hostOrigins`. With the
  script tag, load the script from the same CrackPay you test in.
- **A blank frame.** Your server is refusing to be framed. Check
  `X-Frame-Options` and `frame-ancestors`; see [UI and container](./ui-and-container.md).
- **Error 4100.** The call is not allowed for your app. In a listed app, the
  contract is not in your listing.
- **Error 4200.** The method is not supported. See the [reference](./reference.md).

/**
 * The site and the wallet app are deployed separately, so every link into the
 * product crosses an origin and has to be absolute. One place builds them.
 *
 * This site never calls WebAuthn — passkeys are created and used only in the
 * app — so the site's own domain carries no constraint and can move freely.
 * The app's cannot: whatever origin serves `NEXT_PUBLIC_APP_URL` is where
 * credentials bind, and changing it later locks every user out. The app is
 * served from crackpay.xyz, which is therefore the passkey domain and the
 * default here; `.env.local` points it at port 3000 for local work.
 */
const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://crackpay.xyz").replace(/\/$/, "");

export const APP = {
  home: base,
  onboarding: `${base}/onboarding`,
  signin: `${base}/signin`,
  developers: `${base}/developers`,
} as const;

/** The site's own origin, for canonical and share metadata. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

/**
 * Mirrors `apps/web/src/config/onboarding.ts`, and must match it: CrackPay
 * collects no phone number today, so a returning user has no number to be
 * recognised by and goes to the passkey door instead. In phone mode the
 * onboarding flow recognises a number that already has an account and offers
 * its passkey, so both doors lead there and this points at onboarding.
 */
const ONBOARDING_MODE: "phone" | "passkey" =
  process.env.NEXT_PUBLIC_ONBOARDING_MODE === "phone" ? "phone" : "passkey";

export const RETURNING = ONBOARDING_MODE === "phone" ? APP.onboarding : APP.signin;

/**
 * The developer documentation is its own deployment on docs.crackpay.xyz, so
 * every link into it is absolute too. Paths below were checked against the
 * live site on 2026-10-09; its llms.txt is the index they came from.
 */
const docs = (process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.crackpay.xyz").replace(/\/$/, "");

export const DOCS = {
  home: docs,
  quickStart: `${docs}/getting-started/quick-start`,
  skills: `${docs}/ai/skills`,
  submit: `${docs}/guides/submit-your-miniapp`,
} as const;

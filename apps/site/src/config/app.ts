/**
 * The site and the wallet app are deployed separately, so every link into the
 * product crosses an origin and has to be absolute. One place builds them.
 *
 * This site never calls WebAuthn — passkeys are created and used only in the
 * app — so the site's own domain carries no constraint and can move freely.
 * The app's cannot: whatever origin serves `NEXT_PUBLIC_APP_URL` is where
 * credentials bind, and changing it later locks every user out. No trailing
 * slash; locally it is port 3000.
 */
const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const APP = {
  home: base,
  onboarding: `${base}/onboarding`,
  signin: `${base}/signin`,
  developers: `${base}/developers`,
} as const;

/** The site's own origin, for canonical and share metadata. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

/**
 * Mirrors `apps/web/src/config/onboarding.ts`. In phone mode the onboarding
 * flow recognises a number that already has an account and offers its passkey,
 * so a returning user goes through the same door.
 */
const ONBOARDING_MODE: "phone" | "passkey" =
  process.env.NEXT_PUBLIC_ONBOARDING_MODE === "passkey" ? "passkey" : "phone";

export const RETURNING = ONBOARDING_MODE === "phone" ? APP.onboarding : APP.signin;

/**
 * The developer documentation is its own deployment on its own domain, so
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

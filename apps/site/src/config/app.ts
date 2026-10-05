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

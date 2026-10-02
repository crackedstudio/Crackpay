import { createHmac, timingSafeEqual } from "node:crypto";

// Small signed tokens for cookies: base64url(JSON payload) + "." + HMAC-SHA256.
// `typ` keeps a phone-verification token from being accepted as a session.

export type PhoneToken = { typ: "phone"; phoneLookup: string };
export type SessionToken = { typ: "session"; userId: string };
type Payload = PhoneToken | SessionToken;

const mac = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest();

export function signToken(secret: string, payload: Payload, ttlSeconds: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(now / 1000) + ttlSeconds })).toString(
    "base64url",
  );
  return `${body}.${mac(secret, body).toString("base64url")}`;
}

export function verifyToken<T extends Payload["typ"]>(
  secret: string,
  token: string | undefined,
  typ: T,
  now = Date.now(),
): Extract<Payload, { typ: T }> | null {
  if (!token) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;

  const expected = mac(secret, body);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const { typ: actual, exp } = payload as { typ?: unknown; exp?: unknown };
  if (actual !== typ || typeof exp !== "number" || exp * 1000 <= now) return null;
  return payload as Extract<Payload, { typ: T }>;
}

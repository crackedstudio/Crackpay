// Server only: never import this from a client component.
import { createPrivateKey, sign } from "node:crypto";

// Minimal VAPID (RFC 8292) for Web Push, so no push library is needed.
// Keys are the usual base64url pair: a 65-byte uncompressed P-256 public key
// and a 32-byte private scalar. Generate with scripts/generate-vapid-keys.ts.

export class VapidConfigError extends Error {
  override name = "VapidConfigError";
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function vapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) throw new VapidConfigError("VAPID_PUBLIC_KEY is not set");
  return key;
}

/** The Authorization header value for a push request to `endpoint`. */
export function vapidAuthorization(
  endpoint: string,
  subject: string,
  keys: { publicKey: string; privateKey: string },
  now: number = Date.now(),
): string {
  const publicBytes = Buffer.from(keys.publicKey, "base64url");
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new VapidConfigError("VAPID public key must be a 65-byte uncompressed P-256 point");
  }
  const privateKey = createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      d: keys.privateKey,
      x: base64url(publicBytes.subarray(1, 33)),
      y: base64url(publicBytes.subarray(33, 65)),
    },
  });

  const header = base64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = base64url(
    JSON.stringify({
      aud: new URL(endpoint).origin,
      exp: Math.floor(now / 1000) + 12 * 60 * 60,
      sub: subject,
    }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  return `vapid t=${header}.${claims}.${base64url(signature)}, k=${keys.publicKey}`;
}

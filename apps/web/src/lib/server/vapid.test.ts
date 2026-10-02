import { createECDH, createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { VapidConfigError, vapidAuthorization } from "./vapid";

function keyPair() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const privateKey = Buffer.concat([Buffer.alloc(32), ecdh.getPrivateKey()]).subarray(-32);
  return {
    publicKey: ecdh.getPublicKey().toString("base64url"),
    privateKey: privateKey.toString("base64url"),
  };
}

const endpoint = "https://fcm.googleapis.com/fcm/send/abc123";
const now = Date.UTC(2026, 9, 2);

describe("vapidAuthorization", () => {
  it("produces a JWT that verifies against the public key", () => {
    const keys = keyPair();
    const header = vapidAuthorization(endpoint, "mailto:ops@example.com", keys, now);

    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, jwtHeader, claims, signature, k] = match ?? [];
    expect(k).toBe(keys.publicKey);

    const point = Buffer.from(keys.publicKey, "base64url");
    const publicKey = createPublicKey({
      format: "jwk",
      key: {
        kty: "EC",
        crv: "P-256",
        x: point.subarray(1, 33).toString("base64url"),
        y: point.subarray(33, 65).toString("base64url"),
      },
    });
    const valid = verify(
      "sha256",
      Buffer.from(`${jwtHeader}.${claims}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature ?? "", "base64url"),
    );
    expect(valid).toBe(true);
  });

  it("sets audience, subject and a 12 hour expiry", () => {
    const header = vapidAuthorization(endpoint, "mailto:ops@example.com", keyPair(), now);
    const claims = header.split(".")[1] ?? "";
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toEqual({
      aud: "https://fcm.googleapis.com",
      exp: now / 1000 + 12 * 60 * 60,
      sub: "mailto:ops@example.com",
    });
  });

  it("rejects a malformed public key", () => {
    const keys = { ...keyPair(), publicKey: "AAAA" };
    expect(() => vapidAuthorization(endpoint, "mailto:ops@example.com", keys)).toThrow(
      VapidConfigError,
    );
  });
});

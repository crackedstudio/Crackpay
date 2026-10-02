import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./tokens";

const SECRET = "secret";
const now = Date.UTC(2026, 9, 2);

describe("signed tokens", () => {
  it("round-trips a payload until it expires", () => {
    const token = signToken(SECRET, { typ: "session", userId: "u1" }, 60, now);
    expect(verifyToken(SECRET, token, "session", now)).toMatchObject({ typ: "session", userId: "u1" });
    expect(verifyToken(SECRET, token, "session", now + 59_000)).not.toBeNull();
    expect(verifyToken(SECRET, token, "session", now + 60_000)).toBeNull();
  });

  it("does not accept a phone token as a session, or the reverse", () => {
    const phone = signToken(SECRET, { typ: "phone", phoneLookup: "0xabc" }, 60, now);
    expect(verifyToken(SECRET, phone, "session", now)).toBeNull();
    expect(verifyToken(SECRET, phone, "phone", now)).toMatchObject({ phoneLookup: "0xabc" });
  });

  it("rejects tampering, another secret and junk", () => {
    const token = signToken(SECRET, { typ: "session", userId: "u1" }, 60, now);
    const [body, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ typ: "session", userId: "u2", exp: 9_999_999_999 })).toString("base64url");

    expect(verifyToken(SECRET, `${forged}.${signature}`, "session", now)).toBeNull();
    expect(verifyToken("other", token, "session", now)).toBeNull();
    expect(verifyToken(SECRET, `${body}.`, "session", now)).toBeNull();
    expect(verifyToken(SECRET, `${token}.extra`, "session", now)).toBeNull();
    expect(verifyToken(SECRET, "garbage", "session", now)).toBeNull();
    expect(verifyToken(SECRET, undefined, "session", now)).toBeNull();
  });
});

import { ApiError, ServerConfigError } from "./errors";
import type { CodeVerifier } from "./sms";

// Twilio Verify over its REST API, so no SDK is needed.
// https://www.twilio.com/docs/verify/api

type TwilioError = { code?: number; message?: string };

// Twilio error codes that are the caller's situation rather than our bug.
const FRIENDLY: Record<number, string> = {
  60200: "That phone number doesn't look right. Check it and try again.",
  60203: "Too many codes sent to this number. Wait a while and try again.",
  60212: "Too many attempts. Wait a while and try again.",
  60410: "We can't send a code to this number right now.",
  60605: "We can't send codes to this country yet.",
  21608: "This number can't receive codes until it is verified in the Twilio trial account.",
};

export function twilioVerify(config: { accountSid: string; authToken: string; serviceSid: string }): CodeVerifier {
  const base = `https://verify.twilio.com/v2/Services/${config.serviceSid}`;
  const authorization = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;

  async function post(path: string, form: Record<string, string>): Promise<{ status: number; body: Record<string, unknown> }> {
    const response = await fetch(`${base}/${path}`, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
    });
    const body = ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    return { status: response.status, body };
  }

  function fail(action: string, status: number, body: TwilioError): never {
    console.error(`Twilio Verify ${action} failed`, status, body.code, body.message);
    if (status === 401) throw new ServerConfigError("Twilio rejected the account SID or auth token");
    const friendly = body.code === undefined ? undefined : FRIENDLY[body.code];
    if (friendly) throw new ApiError(status === 429 ? 429 : 400, "sms_failed", friendly);
    throw new ApiError(502, "sms_failed", "We couldn't send the code. Try again in a moment.");
  }

  return {
    async start(phone) {
      const { status, body } = await post("Verifications", { To: phone, Channel: "sms" });
      if (status >= 300 || typeof body.sid !== "string") fail("start", status, body);
      return body.sid;
    },

    async check(reference, code) {
      const { status, body } = await post("VerificationCheck", { VerificationSid: reference, Code: code });
      // 404: the verification expired, was already approved, or ran out of attempts.
      if (status === 404) return false;
      if (status >= 300) fail("check", status, body);
      return body.status === "approved";
    },
  };
}

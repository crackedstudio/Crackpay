import { identityDeps } from "@/lib/server/context";
import { readBody, respond, setPhoneCookie, setSessionCookie, stringField } from "@/lib/server/http";
import { verifyOtp } from "@/lib/server/identity-service";

export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const body = await readBody(request);
    const { phoneLookup, user } = await verifyOtp(identityDeps(), stringField(body, "challengeId"), stringField(body, "code"));

    // A number that already has an account signs straight in; a new one may go on to register.
    if (user?.status === "registered") {
      await setSessionCookie(user.id);
      return { status: "registered", account: user.smartAccount, handle: user.handle };
    }
    await setPhoneCookie(phoneLookup);
    return { status: "new" };
  });
}

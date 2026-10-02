import { identityDeps } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { readBody, requireSession, respond, stringField } from "@/lib/server/http";
import { resolvePhoneNumber } from "@/lib/server/identity-service";

// Phone → account. Signed-in users only, one number per call, rate-limited per user.
export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const { userId } = await requireSession();
    const body = await readBody(request);
    const found = await resolvePhoneNumber(identityDeps(), userId, stringField(body, "phone"));
    if (!found) throw new ApiError(404, "not_found", "That number is not on CrackPay yet.");
    return found;
  });
}

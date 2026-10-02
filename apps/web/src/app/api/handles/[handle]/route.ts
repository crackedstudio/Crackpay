import { ONBOARDING_MODE } from "@/config/onboarding";
import { identityDeps } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { clientIp, readPhoneToken, readSessionToken, respond } from "@/lib/server/http";
import { isHandleAvailable } from "@/lib/server/identity-service";

export function GET(request: Request, { params }: { params: Promise<{ handle: string }> }): Promise<Response> {
  return respond(async () => {
    // Handles are public on-chain; in phone mode the check is still kept behind a verified number.
    if (ONBOARDING_MODE === "phone" && !(await readPhoneToken()) && !(await readSessionToken())) {
      throw new ApiError(401, "phone_unverified", "Verify your phone number first.");
    }
    const deps = identityDeps();
    if (!(await deps.store.hit(`handle:${clientIp(request)}`, 60, 60))) {
      throw new ApiError(429, "rate_limited", "Too many attempts. Wait a while and try again.");
    }
    const { handle } = await params;
    return { available: await isHandleAvailable(deps, handle) };
  });
}

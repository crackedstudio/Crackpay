import { identityDeps } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { clearCookies, requireSession, respond } from "@/lib/server/http";

export function GET(): Promise<Response> {
  return respond(async () => {
    const { userId } = await requireSession();
    const user = await identityDeps().store.getUserById(userId);
    if (!user || user.status !== "registered") throw new ApiError(401, "signed_out", "Sign in to continue.");
    return { account: user.smartAccount, handle: user.handle };
  });
}

export function DELETE(): Promise<Response> {
  return respond(async () => {
    await clearCookies();
    return { ok: true };
  });
}

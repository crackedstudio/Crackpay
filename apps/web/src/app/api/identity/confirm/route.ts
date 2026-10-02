import { isAddress } from "viem";
import { identityDeps } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { readBody, respond, setSessionCookie, stringField } from "@/lib/server/http";
import { confirmRegistration } from "@/lib/server/identity-service";
import { registrantLookup } from "@/lib/server/registrant";

export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const body = await readBody(request);
    const account = stringField(body, "account");
    if (!isAddress(account)) throw new ApiError(400, "invalid_account", "Invalid account");

    const deps = identityDeps();
    const user = await confirmRegistration(deps, await registrantLookup(deps, request, account));
    await setSessionCookie(user.id);
    return { account: user.smartAccount, handle: user.handle };
  });
}

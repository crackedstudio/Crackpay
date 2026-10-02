import { isAddress } from "viem";
import { normalizeHandle } from "@/lib/handle";
import { identityDeps } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { readBody, respond, stringField } from "@/lib/server/http";
import { attestRegistration } from "@/lib/server/identity-service";
import { registrantLookup } from "@/lib/server/registrant";

export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const body = await readBody(request);
    const account = stringField(body, "account");
    if (!isAddress(account)) throw new ApiError(400, "invalid_account", "Invalid account");

    const deps = identityDeps();
    const lookup = await registrantLookup(deps, request, account);
    return attestRegistration(deps, lookup, account, normalizeHandle(stringField(body, "handle")));
  });
}

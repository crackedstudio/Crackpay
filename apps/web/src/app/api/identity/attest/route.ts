import { isAddress } from "viem";
import { normalizeHandle } from "@/lib/handle";
import { identityDeps } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { readBody, requirePhone, respond, stringField } from "@/lib/server/http";
import { attestRegistration } from "@/lib/server/identity-service";
import type { Hex } from "viem";

export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const { phoneLookup } = await requirePhone();
    const body = await readBody(request);
    const account = stringField(body, "account");
    if (!isAddress(account)) throw new ApiError(400, "invalid_account", "Invalid account");
    return attestRegistration(identityDeps(), phoneLookup as Hex, account, normalizeHandle(stringField(body, "handle")));
  });
}

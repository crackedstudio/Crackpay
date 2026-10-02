import type { Hex } from "viem";
import { identityDeps } from "@/lib/server/context";
import { requirePhone, respond, setSessionCookie } from "@/lib/server/http";
import { confirmRegistration } from "@/lib/server/identity-service";

export function POST(): Promise<Response> {
  return respond(async () => {
    const { phoneLookup } = await requirePhone();
    const user = await confirmRegistration(identityDeps(), phoneLookup as Hex);
    await setSessionCookie(user.id);
    return { account: user.smartAccount, handle: user.handle };
  });
}

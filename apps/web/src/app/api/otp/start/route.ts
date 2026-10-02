import { identityDeps } from "@/lib/server/context";
import { clientIp, readBody, respond, stringField } from "@/lib/server/http";
import { startOtp } from "@/lib/server/identity-service";

export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const body = await readBody(request);
    return startOtp(identityDeps(), stringField(body, "phone"), clientIp(request));
  });
}

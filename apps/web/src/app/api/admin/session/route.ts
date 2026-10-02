import { checkAdminPassword } from "@/lib/server/admin";
import { getStore } from "@/lib/server/context";
import { clearAdminCookie, clientIp, isAdmin, readBody, respond, setAdminCookie, stringField } from "@/lib/server/http";

export function GET(): Promise<Response> {
  return respond(async () => ({ admin: await isAdmin() }));
}

export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const body = await readBody(request);
    await checkAdminPassword(getStore(), process.env.ADMIN_PASSWORD, stringField(body, "password"), clientIp(request));
    await setAdminCookie();
    return { admin: true };
  });
}

export function DELETE(): Promise<Response> {
  return respond(async () => {
    await clearAdminCookie();
    return { admin: false };
  });
}

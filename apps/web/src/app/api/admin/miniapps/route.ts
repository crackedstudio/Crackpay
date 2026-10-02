import { saveMiniAppFromInput } from "@/lib/server/admin";
import { getStore } from "@/lib/server/context";
import { readBody, requireAdmin, respond } from "@/lib/server/http";

export function GET(): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    return { apps: await getStore().listMiniApps() };
  });
}

export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    return { app: await saveMiniAppFromInput(getStore(), await readBody(request)) };
  });
}

import { visibleMiniApps } from "@/lib/miniapp/registry";
import { getStore } from "@/lib/server/context";
import { respond } from "@/lib/server/http";

// Read fresh every time, so switching an app off in the admin takes effect at once.
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return respond(async () => ({ apps: visibleMiniApps(await getStore().listMiniApps()) }));
}

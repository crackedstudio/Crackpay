import { visibleMiniApps } from "@/lib/miniapp/registry";
import { getStore } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { respond } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return respond(async () => {
    const { id } = await params;
    const record = await getStore().getMiniApp(id);
    const [app] = record ? visibleMiniApps([record]) : [];
    if (!app) throw new ApiError(404, "not_found", "This app isn't available.");
    return { app };
  });
}

import { saveMiniAppFromInput } from "@/lib/server/admin";
import { getStore } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { readBody, requireAdmin, respond } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export function GET(_request: Request, { params }: Context): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    const app = await getStore().getMiniApp((await params).id);
    if (!app) throw new ApiError(404, "not_found", "No such app.");
    return { app };
  });
}

export function PUT(request: Request, { params }: Context): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    const { id } = await params;
    if (!(await getStore().getMiniApp(id))) throw new ApiError(404, "not_found", "No such app.");
    return { app: await saveMiniAppFromInput(getStore(), await readBody(request), id) };
  });
}

export function DELETE(_request: Request, { params }: Context): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    await getStore().deleteMiniApp((await params).id);
    return { ok: true };
  });
}

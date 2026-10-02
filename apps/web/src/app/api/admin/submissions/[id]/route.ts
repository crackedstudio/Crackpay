import { reviewSubmission } from "@/lib/server/admin";
import { getStore } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { readBody, requireAdmin, respond } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export function GET(_request: Request, { params }: Context): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    const submission = await getStore().getSubmission((await params).id);
    if (!submission) throw new ApiError(404, "not_found", "No such submission.");
    return { submission };
  });
}

export function PATCH(request: Request, { params }: Context): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    const body = await readBody(request);
    await reviewSubmission(getStore(), (await params).id, body.status, body.notes);
    return { ok: true };
  });
}

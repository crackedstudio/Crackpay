import { getStore } from "@/lib/server/context";
import { requireAdmin, respond } from "@/lib/server/http";

export function GET(): Promise<Response> {
  return respond(async () => {
    await requireAdmin();
    return { submissions: await getStore().listSubmissions() };
  });
}

"use client";

import { use, useEffect, useState } from "react";
import { MiniAppForm, toDraft } from "@/components/admin/MiniAppForm";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";
import type { MiniAppRecord } from "@/lib/miniapp/registry";

export default function EditMiniApp({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [app, setApp] = useState<MiniAppRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ app: MiniAppRecord }>(`/api/admin/miniapps/${id}`).then(
      (result) => setApp(result.app),
      (caught: unknown) => setError(errorText(caught)),
    );
  }, [id]);

  return (
    <>
      <h1 className="text-xl font-semibold">{app ? `Edit ${app.name}` : "Edit Mini App"}</h1>
      <Notice>{error}</Notice>
      {app ? <MiniAppForm initial={toDraft(app)} existing /> : !error && <p className="text-sm text-muted">Loading…</p>}
    </>
  );
}

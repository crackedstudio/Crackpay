"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminButton, Notice, Pill } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";
import type { MiniAppRecord } from "@/lib/miniapp/registry";

export default function AdminMiniApps() {
  const [apps, setApps] = useState<MiniAppRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<{ apps: MiniAppRecord[] }>("/api/admin/miniapps").then(
      (result) => setApps(result.apps),
      (caught: unknown) => setError(errorText(caught)),
    );
  }, []);

  useEffect(load, [load]);

  async function toggle(app: MiniAppRecord) {
    setBusyId(app.id);
    setError(null);
    try {
      await api.put(`/api/admin/miniapps/${app.id}`, { ...app, enabled: !app.enabled });
      load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Mini Apps</h1>
          <p className="text-sm text-muted">Only apps listed and switched on here appear in CrackPay.</p>
        </div>
        <Link href="/admin/apps/new" className="inline-flex h-9 items-center rounded-lg bg-foreground px-3 text-sm font-medium text-background">
          New Mini App
        </Link>
      </div>

      <Notice>{error}</Notice>

      {apps === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : apps.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-6 text-sm text-muted">No Mini Apps yet. Add the first one.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Network</th>
                <th className="px-4 py-3 font-medium">Contracts</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {apps.map((app) => (
                <tr key={app.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{app.name}</span>
                    <span className="block text-muted">/apps/{app.id}</span>
                  </td>
                  <td className="max-w-56 truncate px-4 py-3">{new URL(app.url).host}</td>
                  <td className="px-4 py-3">{app.network === "arc-testnet" ? "Testnet" : "Mainnet"}</td>
                  <td className="px-4 py-3">{app.contracts.length}</td>
                  <td className="px-4 py-3">
                    <Pill tone={app.enabled ? "on" : "off"}>{app.enabled ? "Live" : "Off"}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <AdminButton disabled={busyId === app.id} onClick={() => toggle(app)}>
                        {app.enabled ? "Switch off" : "Switch on"}
                      </AdminButton>
                      <Link href={`/admin/apps/${app.id}`} className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 font-medium">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

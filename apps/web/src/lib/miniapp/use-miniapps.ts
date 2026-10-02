"use client";

import { useEffect, useState } from "react";
import type { MiniApp } from "@/config/miniapps";
import { api, ApiClientError } from "../api";

/** The listed Mini Apps, from the registry. Null while loading. */
export function useMiniApps(): { apps: MiniApp[] | null; failed: boolean } {
  const [apps, setApps] = useState<MiniApp[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    api.get<{ apps: MiniApp[] }>("/api/miniapps").then(
      (result) => current && setApps(result.apps),
      (error: unknown) => {
        console.error("Could not load Mini Apps", error);
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, []);

  return { apps, failed };
}

export type MiniAppLookup =
  | { status: "loading" }
  | { status: "ready"; app: MiniApp }
  /** Not listed, or switched off. */
  | { status: "missing" }
  | { status: "failed" };

export function useMiniApp(id: string): MiniAppLookup {
  const [lookup, setLookup] = useState<MiniAppLookup>({ status: "loading" });

  useEffect(() => {
    let current = true;
    api.get<{ app: MiniApp }>(`/api/miniapps/${encodeURIComponent(id)}`).then(
      (result) => current && setLookup({ status: "ready", app: result.app }),
      (error: unknown) => {
        if (!current) return;
        if (error instanceof ApiClientError && error.status === 404) return setLookup({ status: "missing" });
        console.error("Could not load the Mini App", error);
        setLookup({ status: "failed" });
      },
    );
    return () => {
      current = false;
    };
  }, [id]);

  return lookup;
}

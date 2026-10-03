"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AdminButton, Field, Notice, inputClass } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/admin/session", { password });
      router.replace("/admin");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={signIn} className="mx-auto mt-16 flex w-full max-w-sm flex-col gap-4 rounded-md border border-hair bg-card p-6">
      <h1 className="text-lg font-semibold">Sign in</h1>
      <Field label="Admin password">
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <Notice>{error}</Notice>
      <AdminButton tone="primary" disabled={busy || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </AdminButton>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminButton, Notice, Pill } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";

type Submission = {
  id: string;
  contact: string;
  listing: { name?: string; url?: string; publisher?: string };
  status: "pending" | "approved" | "rejected";
  reviewNotes: string | null;
  createdAt: string;
};

const statusTone = { pending: "warn", approved: "on", rejected: "bad" } as const;
const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<{ submissions: Submission[] }>("/api/admin/submissions").then(
      (result) => setSubmissions(result.submissions),
      (caught: unknown) => setError(errorText(caught)),
    );
  }, []);

  useEffect(load, [load]);

  async function review(id: string, status: Submission["status"]) {
    setError(null);
    try {
      await api.patch(`/api/admin/submissions/${id}`, { status, notes });
      setNotes("");
      load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Submissions</h1>
        <p className="text-sm text-muted">
          Listings developers have sent in. Nothing here is live until you create a Mini App from it.
        </p>
      </div>
      <Notice>{error}</Notice>

      {submissions === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-6 text-sm text-muted">No submissions yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((submission) => {
            const expanded = open === submission.id;
            return (
              <li key={submission.id} className="rounded-2xl border border-line bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{submission.listing.name ?? "Untitled"}</p>
                    <p className="truncate text-muted">
                      {submission.listing.url} · {submission.contact} · {date.format(new Date(submission.createdAt))}
                    </p>
                  </div>
                  <Pill tone={statusTone[submission.status]}>{submission.status}</Pill>
                  <AdminButton
                    onClick={() => {
                      setOpen(expanded ? null : submission.id);
                      setNotes(submission.reviewNotes ?? "");
                    }}
                  >
                    {expanded ? "Close" : "Review"}
                  </AdminButton>
                </div>

                {expanded && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                    <pre className="max-h-96 overflow-auto rounded-lg bg-surface p-3 text-xs">
                      {JSON.stringify(submission.listing, null, 2)}
                    </pre>
                    <textarea
                      className="min-h-20 rounded-lg border border-line bg-card p-3 outline-none focus:border-foreground"
                      placeholder="Review notes (kept with the submission)"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/apps/new?from=${submission.id}`}
                        className="inline-flex h-9 items-center rounded-lg bg-foreground px-3 font-medium text-background"
                      >
                        Create a Mini App from this
                      </Link>
                      <AdminButton tone="danger" onClick={() => review(submission.id, "rejected")}>
                        Reject
                      </AdminButton>
                      {submission.status !== "pending" && (
                        <AdminButton onClick={() => review(submission.id, "pending")}>Back to pending</AdminButton>
                      )}
                      <AdminButton onClick={() => review(submission.id, submission.status)}>Save notes</AdminButton>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Button, ErrorText, Screen, TextField } from "@/components/ui";
import { DOCS } from "@/config/docs";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";
import { LISTING_TEMPLATE } from "@/lib/miniapp/listing";

export default function SubmitMiniApp() {
  const [contact, setContact] = useState("");
  const [listing, setListing] = useState(LISTING_TEMPLATE);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(listing);
    } catch {
      setError("The listing is not valid JSON. Check for a missing comma or quote.");
      return;
    }

    setBusy(true);
    try {
      const result = await api.post<{ reference: string }>("/api/miniapps/submissions", { contact, listing: parsed });
      setReference(result.reference);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (reference) {
    return (
      <Screen title="Submitted" back="/developers">
        <p>Thanks. The CrackPay team will review your listing and reply to {contact}.</p>
        <p className="text-sm text-muted">
          Reference: <span className="break-all font-mono">{reference}</span>
        </p>
      </Screen>
    );
  }

  return (
    <Screen title="Submit a Mini App" back="/developers">
      <p className="text-muted">
        Fill in the listing file and submit it for review. The fields are explained in{" "}
        <a className="text-money" href={DOCS.submit} target="_blank" rel="noreferrer">
          Get listed
        </a>
        . Test your app in Developer mode first.
      </p>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextField
          label="Your email"
          type="email"
          autoComplete="email"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Listing file (JSON)</span>
          <textarea
            className="min-h-96 rounded-xl border border-hair bg-card p-3 font-mono text-xs outline-none focus:border-ink"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            value={listing}
            onChange={(event) => setListing(event.target.value)}
          />
        </label>
        <ErrorText>{error}</ErrorText>
        <Button disabled={busy || !contact.trim()}>{busy ? "Submitting…" : "Submit for review"}</Button>
      </form>
    </Screen>
  );
}

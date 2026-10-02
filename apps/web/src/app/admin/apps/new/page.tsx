"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EMPTY_DRAFT, MiniAppForm, slugify } from "@/components/admin/MiniAppForm";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";
import type { Listing } from "@/lib/miniapp/listing";

type Draft = typeof EMPTY_DRAFT;

/** Starts the form from a developer's submission. The admin still checks and completes it. */
function fromListing(listing: Listing): Draft {
  return {
    ...EMPTY_DRAFT,
    id: slugify(listing.name),
    name: listing.name,
    tagline: listing.tagline,
    publisher: listing.publisher,
    category: listing.category,
    url: listing.url,
    icon: listing.icon,
    network: listing.network,
    contracts: listing.contracts.map((contract) => ({ address: contract.address, name: contract.name })),
    tokenApprovals: listing.tokenApprovals,
  };
}

function NewMiniApp() {
  const from = useSearchParams().get("from");
  const [initial, setInitial] = useState<Draft | null>(from ? null : EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from) return;
    api.get<{ submission: { listing: Listing } }>(`/api/admin/submissions/${from}`).then(
      (result) => setInitial(fromListing(result.submission.listing)),
      (caught: unknown) => {
        setError(errorText(caught));
        setInitial(EMPTY_DRAFT);
      },
    );
  }, [from]);

  // Once the app exists, the submission it came from is done.
  const markApproved = from ? async () => void (await api.patch(`/api/admin/submissions/${from}`, { status: "approved" })) : undefined;

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">New Mini App</h1>
        {from && <p className="text-sm text-muted">Filled in from a developer&apos;s submission. Check every field before saving.</p>}
      </div>
      <Notice>{error}</Notice>
      {initial ? (
        <MiniAppForm initial={initial} existing={false} onSaved={markApproved} />
      ) : (
        <p className="text-sm text-muted">Loading…</p>
      )}
    </>
  );
}

export default function NewMiniAppPage() {
  return (
    // useSearchParams needs a Suspense boundary to prerender.
    <Suspense>
      <NewMiniApp />
    </Suspense>
  );
}

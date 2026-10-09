"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { errorText } from "@/lib/format";
import { LISTING_CATEGORIES, LISTING_NETWORKS, LISTING_TOKENS } from "@/lib/miniapp/listing";
import { CURRENT_NETWORK, type MiniAppRecord } from "@/lib/miniapp/registry";
import { AdminButton, Field, Notice, inputClass } from "./ui";

type Draft = Omit<MiniAppRecord, "icon" | "contracts" | "sortOrder"> & {
  icon: string;
  contracts: { address: string; name: string }[];
  sortOrder: string;
};

export const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  tagline: "",
  publisher: "",
  category: "finance",
  url: "",
  icon: "",
  network: CURRENT_NETWORK,
  contracts: [],
  tokenApprovals: [],
  enabled: false,
  sortOrder: "0",
};

export function toDraft(app: MiniAppRecord): Draft {
  return { ...app, icon: app.icon ?? "", contracts: app.contracts.map((c) => ({ ...c })), sortOrder: String(app.sortOrder) };
}

/** A URL-safe id suggested from an app's name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 31);
}

/**
 * Create or edit a listed Mini App. `existing` means editing: the id is fixed.
 * `onSaved` runs after a successful save, before returning to the list.
 */
export function MiniAppForm({
  initial,
  existing,
  onSaved,
}: {
  initial: Draft;
  existing: boolean;
  onSaved?: () => Promise<void>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const setContract = (index: number, key: "address" | "name", value: string) =>
    set(
      "contracts",
      draft.contracts.map((contract, i) => (i === index ? { ...contract, [key]: value } : contract)),
    );

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        ...draft,
        icon: draft.icon.trim() || null,
        sortOrder: Number(draft.sortOrder),
        contracts: draft.contracts.map((contract) => ({ address: contract.address.trim(), name: contract.name })),
      };
      if (existing) await api.put(`/api/admin/miniapps/${draft.id}`, body);
      else await api.post("/api/admin/miniapps", body);
      await onSaved?.();
      router.push("/admin");
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/api/admin/miniapps/${draft.id}`);
      router.push("/admin");
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
    }
  }

  const section = "flex flex-col gap-4 rounded-md border border-hair bg-card p-5";
  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <section className={section}>
        <h2 className="font-semibold">Listing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value;
                // While creating, keep the id following the name until it is edited by hand.
                setDraft((current) => ({
                  ...current,
                  name,
                  id: !existing && current.id === slugify(current.name) ? slugify(name) : current.id,
                }));
              }}
            />
          </Field>
          <Field label="ID" hint={existing ? "Fixed once created." : `Opens at /apps/${draft.id || "…"}`}>
            <input
              className={inputClass}
              disabled={existing}
              autoCapitalize="none"
              spellCheck={false}
              value={draft.id}
              onChange={(event) => set("id", event.target.value)}
            />
          </Field>
        </div>
        <Field label="Tagline" hint="One or two sentences, shown on the Apps page.">
          <input className={inputClass} value={draft.tagline} onChange={(event) => set("tagline", event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Publisher">
            <input className={inputClass} value={draft.publisher} onChange={(event) => set("publisher", event.target.value)} />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={draft.category} onChange={(event) => set("category", event.target.value as Draft["category"])}>
              {LISTING_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Network">
            <select className={inputClass} value={draft.network} onChange={(event) => set("network", event.target.value as Draft["network"])}>
              {LISTING_NETWORKS.map((network) => (
                <option key={network}>{network}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Where it loads from</h2>
        <Field label="App URL" hint="The only site this app's page may show. Must be https:// and not CrackPay's own address.">
          <input
            className={inputClass}
            type="url"
            placeholder="https://"
            autoCapitalize="none"
            spellCheck={false}
            value={draft.url}
            onChange={(event) => set("url", event.target.value)}
          />
        </Field>
        <Field label="Icon URL" hint="Optional. Square image, https://.">
          <input
            className={inputClass}
            type="url"
            placeholder="https://"
            autoCapitalize="none"
            spellCheck={false}
            value={draft.icon}
            onChange={(event) => set("icon", event.target.value)}
          />
        </Field>
      </section>

      <section className={section}>
        <div>
          <h2 className="font-semibold">What it may call</h2>
          <p className="text-sm text-muted">
            The app can send transactions to these contracts and to nothing else.
          </p>
        </div>
        {draft.contracts.map((contract, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_14rem_auto]">
            <input
              className={`${inputClass} font-mono`}
              placeholder="0x contract address"
              autoCapitalize="none"
              spellCheck={false}
              aria-label={`Contract ${index + 1} address`}
              value={contract.address}
              onChange={(event) => setContract(index, "address", event.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Name"
              aria-label={`Contract ${index + 1} name`}
              value={contract.name}
              onChange={(event) => setContract(index, "name", event.target.value)}
            />
            <AdminButton type="button" onClick={() => set("contracts", draft.contracts.filter((_, i) => i !== index))}>
              Remove
            </AdminButton>
          </div>
        ))}
        <div>
          <AdminButton type="button" onClick={() => set("contracts", [...draft.contracts, { address: "", name: "" }])}>
            Add a contract
          </AdminButton>
        </div>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">Token allowances</legend>
          <p className="text-muted">Tokens the app may ask the user to let one of its contracts spend.</p>
          <div className="flex gap-5">
            {LISTING_TOKENS.map((token) => (
              <label key={token} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.tokenApprovals.includes(token)}
                  onChange={(event) =>
                    set(
                      "tokenApprovals",
                      event.target.checked ? [...draft.tokenApprovals, token] : draft.tokenApprovals.filter((t) => t !== token),
                    )
                  }
                />
                {token}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Visibility</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => set("enabled", event.target.checked)} />
          Live: show this app in CrackPay and let users open it
        </label>
        <div className="max-w-40">
          <Field label="Position" hint="Lower numbers come first.">
            <input
              className={inputClass}
              type="number"
              step={1}
              value={draft.sortOrder}
              onChange={(event) => set("sortOrder", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <Notice>{error}</Notice>

      <div className="flex items-center gap-2">
        <AdminButton tone="primary" disabled={busy}>
          {busy ? "Saving…" : existing ? "Save changes" : "Create Mini App"}
        </AdminButton>
        <AdminButton type="button" disabled={busy} onClick={() => router.push("/admin")}>
          Cancel
        </AdminButton>
        {existing &&
          (confirmDelete ? (
            <span className="ml-auto flex items-center gap-2 text-sm">
              Delete {draft.name} for good?
              <AdminButton type="button" tone="danger" disabled={busy} onClick={remove}>
                Yes, delete
              </AdminButton>
              <AdminButton type="button" onClick={() => setConfirmDelete(false)}>
                No
              </AdminButton>
            </span>
          ) : (
            <AdminButton type="button" tone="danger" className="ml-auto" onClick={() => setConfirmDelete(true)}>
              Delete
            </AdminButton>
          ))}
      </div>
    </form>
  );
}

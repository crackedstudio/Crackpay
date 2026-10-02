import { redirect } from "next/navigation";

// Payment links (https://<host>/pay?to=<handle|phone|address>&amount=<decimal>) open the send flow.
export default async function Pay({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["to", "amount"]) {
    const value = params[key];
    if (typeof value === "string") query.set(key, value);
  }
  redirect(`/send?${query}`);
}

import Link from "next/link";
import { miniApps } from "@/config/miniapps";

export default function Discover() {
  const apps = miniApps.filter((app) => app.enabled);
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold">Apps</h1>
      {apps.map((app) => (
        <Link key={app.id} href={`/apps/${app.id}`} className="rounded border border-neutral-300 p-3">
          <p className="font-medium">{app.name}</p>
          <p className="text-sm opacity-70">{app.description}</p>
        </Link>
      ))}
    </main>
  );
}

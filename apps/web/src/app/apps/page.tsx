import Link from "next/link";
import { Screen } from "@/components/ui";
import { miniApps } from "@/config/miniapps";

export default function Discover() {
  const apps = miniApps.filter((app) => app.enabled);
  return (
    <Screen title="Apps" back="/">
      {apps.map((app) => (
        <Link key={app.id} href={`/apps/${app.id}`} className="rounded-2xl border border-line bg-card p-4">
          <p className="font-medium">{app.name}</p>
          <p className="text-sm text-muted">{app.description}</p>
        </Link>
      ))}
    </Screen>
  );
}

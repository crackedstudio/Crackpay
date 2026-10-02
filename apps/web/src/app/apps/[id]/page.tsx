import { notFound } from "next/navigation";
import { findMiniApp, miniApps } from "@/config/miniapps";
import { MiniAppScreen } from "./MiniAppScreen";

export function generateStaticParams() {
  return miniApps.filter((app) => app.enabled).map((app) => ({ id: app.id }));
}

export default async function MiniAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!findMiniApp(id)) notFound();
  return <MiniAppScreen id={id} />;
}

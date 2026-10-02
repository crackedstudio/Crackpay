import { MiniAppScreen } from "./MiniAppScreen";

// The registry is in the database, so which apps exist is only known per request.
export default async function MiniAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MiniAppScreen id={id} />;
}

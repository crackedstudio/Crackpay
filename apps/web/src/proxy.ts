import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_MINI_APPS } from "./config/miniapps";
import { frameSources, type MiniAppRecord } from "./lib/miniapp/registry";

// Sets which sites a Mini App page may put in a frame. The registry is in the
// database, so this cannot be a static header: /apps/<id> is allowed to frame
// exactly that app's origin, and only while the app is enabled.

export const config = { matcher: ["/apps", "/apps/:path*"] };

type Row = { id: string; url: string; enabled: boolean; network: MiniAppRecord["network"]; sort_order: number; name: string };

/** The one app a path refers to, straight from the database. */
async function lookUp(id: string): Promise<readonly MiniAppRecord[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return DEFAULT_MINI_APPS;

  const response = await fetch(
    `${url}/rest/v1/miniapps?id=eq.${encodeURIComponent(id)}&select=id,url,enabled,network,sort_order,name`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Registry lookup failed with ${response.status}`);
  const rows = (await response.json()) as Row[];
  // Only the fields frameSources reads matter here; the rest are placeholders.
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tagline: "",
    publisher: "",
    category: "utility",
    url: row.url,
    icon: null,
    network: row.network,
    contracts: [],
    tokenApprovals: [],
    enabled: row.enabled,
    sortOrder: row.sort_order,
  }));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const id = /^\/apps\/([^/]+)\/?$/.exec(pathname)?.[1];

  let sources = "'self'";
  try {
    sources = frameSources(pathname, id && id !== "test" ? await lookUp(id) : []);
  } catch (error) {
    // Fail closed: if the registry cannot be read, the page frames nothing.
    console.error("Mini App frame policy lookup failed", error);
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", `frame-src ${sources}`);
  return response;
}

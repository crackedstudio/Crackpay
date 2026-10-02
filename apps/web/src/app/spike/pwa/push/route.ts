// Phase 0 spike — delete once Web Push is proven.
import { VapidConfigError, vapidAuthorization, vapidPublicKey } from "@/lib/server/vapid";

// Only ever POST to real browser push services, never an arbitrary URL.
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com",
];

function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    PUSH_HOSTS.some((host) =>
      host.startsWith(".") ? url.hostname.endsWith(host) : url.hostname === host,
    )
  );
}

function configError(error: unknown): Response {
  if (error instanceof VapidConfigError) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  throw error;
}

export function GET(): Response {
  try {
    return Response.json({ publicKey: vapidPublicKey() });
  } catch (error) {
    return configError(error);
  }
}

// Sends a payload-less push; the service worker shows its default notification.
export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const endpoint =
    typeof body === "object" && body !== null && "endpoint" in body ? body.endpoint : undefined;
  if (!isPushEndpoint(endpoint)) {
    return Response.json({ error: "Not a recognised push endpoint" }, { status: 400 });
  }

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!privateKey || !subject) {
    return Response.json(
      { error: "VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set" },
      { status: 500 },
    );
  }

  let authorization: string;
  try {
    authorization = vapidAuthorization(endpoint, subject, {
      publicKey: vapidPublicKey(),
      privateKey,
    });
  } catch (error) {
    return configError(error);
  }

  const push = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: authorization, TTL: "60", "Content-Length": "0" },
  });
  if (!push.ok) {
    const detail = await push.text();
    console.error("Push service rejected the request", push.status, detail);
    return Response.json({ error: `Push service returned ${push.status}`, detail }, { status: 502 });
  }
  return Response.json({ status: push.status });
}

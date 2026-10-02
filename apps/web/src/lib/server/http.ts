import { cookies } from "next/headers";
import { sessionSecret } from "./context";
import { ApiError, ServerConfigError } from "./errors";
import { signToken, verifyToken, type PhoneToken, type SessionToken } from "./tokens";

const PHONE_COOKIE = "cp_phone";
const SESSION_COOKIE = "cp_session";
const PHONE_TTL = 15 * 60;
const SESSION_TTL = 30 * 24 * 60 * 60;

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

/** Runs a route handler and turns anything it throws into a JSON error. */
export async function respond(handler: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await handler());
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    console.error(error);
    const message = error instanceof ServerConfigError ? `Server is not configured: ${error.message}` : "Something went wrong on our side.";
    return Response.json({ error: { code: "server_error", message } }, { status: 500 });
  }
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "invalid_request", "Expected a JSON object");
  }
  return body as Record<string, unknown>;
}

export function stringField(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new ApiError(400, "invalid_request", `${name} is required`);
  }
  return value;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function setPhoneCookie(phoneLookup: string): Promise<void> {
  (await cookies()).set(PHONE_COOKIE, signToken(sessionSecret(), { typ: "phone", phoneLookup }, PHONE_TTL), cookieOptions(PHONE_TTL));
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signToken(sessionSecret(), { typ: "session", userId }, SESSION_TTL), cookieOptions(SESSION_TTL));
  jar.delete(PHONE_COOKIE);
}

export async function clearCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(PHONE_COOKIE);
  jar.delete(SESSION_COOKIE);
}

export async function readPhoneToken(): Promise<PhoneToken | null> {
  return verifyToken(sessionSecret(), (await cookies()).get(PHONE_COOKIE)?.value, "phone");
}

export async function readSessionToken(): Promise<SessionToken | null> {
  return verifyToken(sessionSecret(), (await cookies()).get(SESSION_COOKIE)?.value, "session");
}

export async function requirePhone(): Promise<PhoneToken> {
  const token = await readPhoneToken();
  if (!token) throw new ApiError(401, "phone_unverified", "Verify your phone number first.");
  return token;
}

export async function requireSession(): Promise<SessionToken> {
  const token = await readSessionToken();
  if (!token) throw new ApiError(401, "signed_out", "Sign in to continue.");
  return token;
}

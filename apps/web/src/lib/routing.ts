/**
 * Where to go once the user is signed in and registered.
 *
 * A payment link opened by someone who is not set up yet must survive
 * onboarding — otherwise they tap "pay @sam" and land on a welcome screen with
 * no memory of who they were paying. Guards stash the route they turned away in
 * a `next` parameter, and the flows hand it back at the end.
 */
const NEXT_PARAM = "next";

/**
 * Accepts only a path on this app. Anything absolute, protocol-relative or
 * otherwise off-site is dropped rather than followed.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

/** `/signin?next=/send%3Fto%3Dsam` for a guard turning someone away from `/send?to=sam`. */
export function withNext(destination: string, next: string | null): string {
  const safe = safeNext(next);
  return safe ? `${destination}?${NEXT_PARAM}=${encodeURIComponent(safe)}` : destination;
}

/** The current URL as a `next` value: path, query, no origin. */
export function currentPath(location: { pathname: string; search: string }): string {
  return `${location.pathname}${location.search}`;
}

export { NEXT_PARAM };

/**
 * How a new account proves it is a real person before it gets a handle.
 *  - "phone": the plan's flow. A phone number is verified by SMS code and bound
 *    to the identity. Needs an SMS provider.
 *  - "passkey": the passkey smart account alone. No phone number is collected,
 *    so nothing stops one person creating many accounts beyond rate limits, and
 *    these identities cannot be found by phone number or recovered by phone.
 * Read on both the server and the client.
 */
export const ONBOARDING_MODE: "phone" | "passkey" =
  process.env.NEXT_PUBLIC_ONBOARDING_MODE === "passkey" ? "passkey" : "phone";

import type { P256Credential } from "viem/account-abstraction";

// The credential is an id and a public key, not a secret. It still belongs in
// an httpOnly cookie once there is a backend session; localStorage is the
// stand-in until Phase 1 onboarding lands.
const CREDENTIAL_KEY = "crackpay.credential";

export function loadCredential(): P256Credential | null {
  const stored = localStorage.getItem(CREDENTIAL_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as P256Credential;
  } catch {
    return null;
  }
}

export function saveCredential(credential: P256Credential): void {
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(credential));
}

export function clearCredential(): void {
  localStorage.removeItem(CREDENTIAL_KEY);
}

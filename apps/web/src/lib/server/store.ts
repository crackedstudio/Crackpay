import type { Address, Hex } from "viem";

export type User = {
  id: string;
  phoneLookup: Hex;
  phoneSalt: Hex;
  phoneHash: Hex;
  smartAccount: Address | null;
  handle: string | null;
  status: "pending" | "registered";
};

export type Challenge = {
  id: string;
  phoneLookup: Hex;
  /** Set when CrackPay generated the code itself. */
  codeHash: string | null;
  /** Set when a hosted verification service holds the code instead. */
  providerRef: string | null;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
};

/** Everything the identity service needs from the database. */
export interface Store {
  /** Counts one hit against `key`. False once `max` hits fall inside the window. */
  hit(key: string, windowSeconds: number, max: number): Promise<boolean>;

  createChallenge(challenge: Omit<Challenge, "attempts" | "consumed">): Promise<void>;
  getChallenge(id: string): Promise<Challenge | null>;
  /** Adds one attempt and returns the new total. */
  bumpChallengeAttempts(id: string): Promise<number>;
  consumeChallenge(id: string): Promise<void>;

  getUserById(id: string): Promise<User | null>;
  getUserByPhone(phoneLookup: Hex): Promise<User | null>;
  /** Creates the pending user for a phone, or updates its account and handle. */
  savePendingUser(user: Omit<User, "id" | "status">): Promise<User>;
  markRegistered(id: string): Promise<void>;
}

/** In-process store for tests and for local development without Supabase. */
export class MemoryStore implements Store {
  private readonly hits = new Map<string, number[]>();
  private readonly challenges = new Map<string, Challenge>();
  private readonly users = new Map<string, User>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async hit(key: string, windowSeconds: number, max: number): Promise<boolean> {
    const cutoff = this.now() - windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > cutoff);
    if (recent.length >= max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(this.now());
    this.hits.set(key, recent);
    return true;
  }

  async createChallenge(challenge: Omit<Challenge, "attempts" | "consumed">): Promise<void> {
    this.challenges.set(challenge.id, { ...challenge, attempts: 0, consumed: false });
  }

  async getChallenge(id: string): Promise<Challenge | null> {
    const challenge = this.challenges.get(id);
    return challenge ? { ...challenge } : null;
  }

  async bumpChallengeAttempts(id: string): Promise<number> {
    const challenge = this.challenges.get(id);
    if (!challenge) return 0;
    challenge.attempts += 1;
    return challenge.attempts;
  }

  async consumeChallenge(id: string): Promise<void> {
    const challenge = this.challenges.get(id);
    if (challenge) challenge.consumed = true;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async getUserByPhone(phoneLookup: Hex): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.phoneLookup === phoneLookup) return { ...user };
    }
    return null;
  }

  async savePendingUser(input: Omit<User, "id" | "status">): Promise<User> {
    const existing = await this.getUserByPhone(input.phoneLookup);
    const user: User = { ...input, id: existing?.id ?? crypto.randomUUID(), status: "pending" };
    this.users.set(user.id, user);
    return { ...user };
  }

  async markRegistered(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) user.status = "registered";
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Address, Hex } from "viem";
import type { Challenge, Store, User } from "./store";

type UserRow = {
  id: string;
  phone_lookup: string;
  phone_salt: string;
  phone_hash: string;
  smart_account: string | null;
  handle: string | null;
  status: "pending" | "registered";
};

type ChallengeRow = {
  id: string;
  phone_lookup: string;
  code_hash: string | null;
  provider_ref: string | null;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  phoneLookup: row.phone_lookup as Hex,
  phoneSalt: row.phone_salt as Hex,
  phoneHash: row.phone_hash as Hex,
  smartAccount: row.smart_account as Address | null,
  handle: row.handle,
  status: row.status,
});

/** Throws on a database error; returns the data otherwise. */
function unwrap<T>(result: { data: T; error: { message: string } | null }, action: string): T {
  if (result.error) throw new Error(`Supabase ${action} failed: ${result.error.message}`);
  return result.data;
}

/** Postgres-backed store. Uses the service role key, so it must only run on the server. */
export class SupabaseStore implements Store {
  private readonly db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async hit(key: string, windowSeconds: number, max: number): Promise<boolean> {
    const result = await this.db.rpc("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
    return unwrap(result, "rate_limit_hit") === true;
  }

  async createChallenge(challenge: Omit<Challenge, "attempts" | "consumed">): Promise<void> {
    const result = await this.db.from("otp_challenges").insert({
      id: challenge.id,
      phone_lookup: challenge.phoneLookup,
      code_hash: challenge.codeHash,
      provider_ref: challenge.providerRef,
      expires_at: new Date(challenge.expiresAt).toISOString(),
    });
    unwrap(result, "create challenge");
  }

  async getChallenge(id: string): Promise<Challenge | null> {
    const result = await this.db.from("otp_challenges").select("*").eq("id", id).maybeSingle<ChallengeRow>();
    const row = unwrap(result, "get challenge");
    if (!row) return null;
    return {
      id: row.id,
      phoneLookup: row.phone_lookup as Hex,
      codeHash: row.code_hash,
      providerRef: row.provider_ref,
      expiresAt: Date.parse(row.expires_at),
      attempts: row.attempts,
      consumed: row.consumed_at !== null,
    };
  }

  async bumpChallengeAttempts(id: string): Promise<number> {
    const result = await this.db.rpc("otp_bump_attempts", { p_id: id });
    return Number(unwrap(result, "bump attempts") ?? 0);
  }

  async consumeChallenge(id: string): Promise<void> {
    const result = await this.db.from("otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", id);
    unwrap(result, "consume challenge");
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db.from("users").select("*").eq("id", id).maybeSingle<UserRow>();
    const row = unwrap(result, "get user");
    return row ? toUser(row) : null;
  }

  async getUserByPhone(phoneLookup: Hex): Promise<User | null> {
    const result = await this.db.from("users").select("*").eq("phone_lookup", phoneLookup).maybeSingle<UserRow>();
    const row = unwrap(result, "get user by phone");
    return row ? toUser(row) : null;
  }

  async savePendingUser(user: Omit<User, "id" | "status">): Promise<User> {
    const result = await this.db
      .from("users")
      .upsert(
        {
          phone_lookup: user.phoneLookup,
          phone_salt: user.phoneSalt,
          phone_hash: user.phoneHash,
          smart_account: user.smartAccount,
          handle: user.handle,
          status: "pending",
        },
        { onConflict: "phone_lookup" },
      )
      .select("*")
      .single<UserRow>();
    const row = unwrap(result, "save user");
    if (!row) throw new Error("Supabase save user returned no row");
    return toUser(row);
  }

  async markRegistered(id: string): Promise<void> {
    const result = await this.db.from("users").update({ status: "registered" }).eq("id", id);
    unwrap(result, "mark registered");
  }

  async saveSubmission(submission: { contact: string; listing: unknown }): Promise<string> {
    const result = await this.db
      .from("miniapp_submissions")
      .insert({ contact: submission.contact, listing: submission.listing })
      .select("id")
      .single<{ id: string }>();
    const row = unwrap(result, "save submission");
    if (!row) throw new Error("Supabase save submission returned no row");
    return row.id;
  }
}

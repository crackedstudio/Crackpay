import { createHash, timingSafeEqual } from "node:crypto";
import { RegistryInputError, parseMiniAppInput, type MiniAppRecord } from "../miniapp/registry";
import { ApiError, ServerConfigError } from "./errors";
import type { Store, Submission } from "./store";

const MIN_PASSWORD_LENGTH = 16;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Compares in constant time, whatever the lengths. */
export function passwordMatches(expected: string, given: string): boolean {
  return timingSafeEqual(digest(expected), digest(given));
}

/**
 * Checks an admin sign-in. Attempts are limited per IP, counted before the
 * comparison so guesses in parallel cannot exceed the cap.
 */
export async function checkAdminPassword(store: Store, configured: string | undefined, given: string, ip: string): Promise<void> {
  if (!configured || configured.length < MIN_PASSWORD_LENGTH) {
    throw new ServerConfigError(`ADMIN_PASSWORD must be set to at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!(await store.hit(`admin:login:${ip}`, 60 * 60, 10))) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Wait an hour and try again.");
  }
  if (!passwordMatches(configured, given)) throw new ApiError(401, "wrong_password", "That password is not right.");
}

/** Validates and stores a Mini App. `expectedId` is set when editing, where the id cannot change. */
export async function saveMiniAppFromInput(store: Store, input: unknown, expectedId?: string): Promise<MiniAppRecord> {
  let record: MiniAppRecord;
  try {
    record = parseMiniAppInput(input);
  } catch (error) {
    if (error instanceof RegistryInputError) throw new ApiError(400, "invalid_miniapp", error.message);
    throw error;
  }

  if (expectedId !== undefined && record.id !== expectedId) {
    throw new ApiError(400, "invalid_miniapp", "An app's id cannot be changed. Create a new app instead.");
  }
  if (expectedId === undefined && (await store.getMiniApp(record.id))) {
    throw new ApiError(409, "id_taken", `An app with the id "${record.id}" already exists.`);
  }
  await store.saveMiniApp(record);
  return record;
}

export async function reviewSubmission(store: Store, id: string, status: unknown, notes: unknown): Promise<void> {
  const allowed: Submission["status"][] = ["pending", "approved", "rejected"];
  if (typeof status !== "string" || !allowed.includes(status as Submission["status"])) {
    throw new ApiError(400, "invalid_request", "status must be pending, approved or rejected");
  }
  if (notes !== undefined && notes !== null && (typeof notes !== "string" || notes.length > 2000)) {
    throw new ApiError(400, "invalid_request", "notes must be text of at most 2000 characters");
  }
  if (!(await store.getSubmission(id))) throw new ApiError(404, "not_found", "No such submission.");
  await store.reviewSubmission(id, status as Submission["status"], typeof notes === "string" && notes.trim() ? notes.trim() : null);
}

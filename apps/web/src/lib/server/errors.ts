/** An error the client is meant to see: an HTTP status and a stable code. */
export class ApiError extends Error {
  override name = "ApiError";
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** A deployment problem, such as a missing secret. Never caused by the caller. */
export class ServerConfigError extends Error {
  override name = "ServerConfigError";
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ServerConfigError(`${name} is not set`);
  return value;
}

/** Calls to the shop's own API. Errors arrive as `ApiRequestError` carrying the server's message. */
import type { ApiError } from "@api";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.error);
    this.name = "ApiRequestError";
  }

  get code(): string | undefined {
    return this.body.code;
  }
}

type Options = { token?: string };

async function call<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  options: Options,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (body !== undefined) headers["content-type"] = "application/json";

  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as ApiError | null) ?? { error: `The shop answered ${response.status}.` };

    throw new ApiRequestError(response.status, error);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options: Options = {}) => call<T>("GET", path, undefined, options),
  post: <T>(path: string, body: unknown = {}, options: Options = {}) =>
    call<T>("POST", path, body, options),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

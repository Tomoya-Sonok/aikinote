import { TRPCError } from "@trpc/server";
import type { StatusCodes } from "http-status-codes";
import { mapTRPCErrorCodeKeyFromStatusCode } from "./error";

const HONO_API_BASE_URL =
  process.env.NEXT_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8787";

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${HONO_API_BASE_URL}${normalizedPath}`;
};

type ErrorLike = {
  error?: string;
  message?: string;
};

const extractErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const errorPayload = payload as ErrorLike;
  return errorPayload.error || errorPayload.message || null;
};

export async function callHonoApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
    ...options,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    throw new TRPCError({
      code: mapTRPCErrorCodeKeyFromStatusCode(response.status as StatusCodes),
      message:
        extractErrorMessage(payload) ||
        `Hono APIの呼び出しに失敗しました (${response.status})`,
    });
  }

  return payload as T;
}

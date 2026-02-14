import { TRPCError } from "@trpc/server";
import type { StatusCodes } from "http-status-codes";
import { getBaseUrl } from "@/lib/utils/env";
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
  const url = buildApiUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-App-Url": getBaseUrl(),
        ...options.headers,
      },
      cache: "no-store",
      ...options,
    });
  } catch (err) {
    const cause = err instanceof Error ? err : undefined;
    const isConnRefused =
      cause?.message?.includes("ECONNREFUSED") ||
      // biome-ignore lint/suspicious/noExplicitAny: dynamic error object
      (cause as any)?.cause?.code === "ECONNREFUSED";

    console.error("[callHonoApi] fetch failed:", {
      url,
      HONO_API_BASE_URL,
      error: cause?.message,
      hint: isConnRefused
        ? `バックエンド (${HONO_API_BASE_URL}) が起動していない可能性があります。pnpm dev (backend) を先に起動してください。`
        : undefined,
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: isConnRefused
        ? `バックエンドAPI (${HONO_API_BASE_URL}) に接続できません。バックエンドが起動しているか確認してください。`
        : `Hono APIの呼び出しに失敗しました: ${cause?.message ?? "unknown error"}`,
      cause: err,
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  // デバッグ用詳細ログ: 成功時も失敗時も重要な情報を記録
  // 認証ヘッダーの有無だけ確認
  const hasAuth = !!options.headers && "Authorization" in options.headers;

  if (!response.ok) {
    const errorMsg = extractErrorMessage(payload);
    console.error(`[callHonoApi] API Error (${response.status}):`, {
      url,
      status: response.status,
      errorMsg,
      hasAuth,
      payload, // 構造化されたエラーレスポンスの中身を確認
    });

    throw new TRPCError({
      code: mapTRPCErrorCodeKeyFromStatusCode(response.status as StatusCodes),
      message:
        errorMsg || `Hono APIの呼び出しに失敗しました (${response.status})`,
    });
  }

  return payload as T;
}

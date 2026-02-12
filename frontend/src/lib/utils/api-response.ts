/**
 * API レスポンス作成のヘルパー関数
 * 統一されたレスポンス形式でAPIを返すための共通関数
 */

import { NextResponse } from "next/server";
import type {
  ApiErrorCode,
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/types/api";
import { API_ERROR_CODES, API_ERROR_MESSAGES } from "@/types/api";

/**
 * 成功レスポンスを作成する
 */
export function createSuccessResponse<T>(
  data: T,
  options: {
    message?: string;
    status?: number;
  } = {},
): NextResponse {
  const { message, status = 200 } = options;

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * エラーレスポンスを作成する
 */
export function createErrorResponse(
  error: string | ApiErrorCode,
  options: {
    details?: Record<string, unknown>;
    code?: ApiErrorCode;
    status?: number;
    message?: string;
  } = {},
): NextResponse {
  const { details, code, message } = options;

  // エラーコードから適切なHTTPステータスを決定
  let status = options.status;
  if (!status) {
    status = getHttpStatusFromErrorCode(error as ApiErrorCode);
  }

  // エラーメッセージの決定
  let errorMessage: string;
  if (typeof error === "string") {
    errorMessage = error;
  } else {
    errorMessage = API_ERROR_MESSAGES[error] || error;
  }

  const response: ApiErrorResponse = {
    success: false,
    error: errorMessage,
    details,
    code: code || (typeof error === "string" ? undefined : error),
    message,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * バリデーションエラーレスポンスを作成する
 */
export function createValidationErrorResponse(
  errors: Record<string, string[]> | string,
  message: string = "入力内容に誤りがあります",
): NextResponse {
  const details = typeof errors === "string" ? { general: [errors] } : errors;

  return createErrorResponse(API_ERROR_CODES.VALIDATION_ERROR, {
    status: 400,
    details,
    message,
  });
}

/**
 * 400 Bad Request レスポンスを作成する
 */
export function createBadRequestResponse(
  message: string = "リクエストの形式が正しくありません",
  options: { details?: Record<string, unknown> } = {},
): NextResponse {
  const { details } = options;

  return createErrorResponse(API_ERROR_CODES.BAD_REQUEST, {
    status: 400,
    message,
    details,
  });
}

/**
 * 認証エラーレスポンスを作成する
 */
export function createUnauthorizedResponse(
  message: string = "認証が必要です",
): NextResponse {
  return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, {
    status: 401,
    message,
  });
}

/**
 * 権限エラーレスポンスを作成する
 */
export function createForbiddenResponse(
  message: string = "このリソースへのアクセス権限がありません",
): NextResponse {
  return createErrorResponse(API_ERROR_CODES.FORBIDDEN, {
    status: 403,
    message,
  });
}

/**
 * Not Foundエラーレスポンスを作成する
 */
export function createNotFoundResponse(
  message: string = "指定されたリソースが見つかりません",
): NextResponse {
  return createErrorResponse(API_ERROR_CODES.NOT_FOUND, {
    status: 404,
    message,
  });
}

/**
 * サーバーエラーレスポンスを作成する
 */
export function createInternalServerErrorResponse(
  error?: Error | string,
  includeDetails: boolean = process.env.NODE_ENV === "development",
): NextResponse {
  const details =
    includeDetails && error
      ? {
          message: typeof error === "string" ? error : error.message,
          ...(typeof error === "object" &&
            error.stack && { stack: error.stack }),
        }
      : undefined;

  return createErrorResponse(API_ERROR_CODES.INTERNAL_SERVER_ERROR, {
    status: 500,
    details,
  });
}

/**
 * エラーコードから適切なHTTPステータスコードを取得する
 */
function getHttpStatusFromErrorCode(code: ApiErrorCode): number {
  switch (code) {
    case API_ERROR_CODES.BAD_REQUEST:
    case API_ERROR_CODES.VALIDATION_ERROR:
      return 400;
    case API_ERROR_CODES.UNAUTHORIZED:
      return 401;
    case API_ERROR_CODES.FORBIDDEN:
      return 403;
    case API_ERROR_CODES.NOT_FOUND:
      return 404;
    case API_ERROR_CODES.CONFLICT:
      return 409;
    case API_ERROR_CODES.INTERNAL_SERVER_ERROR:
      return 500;
    case API_ERROR_CODES.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

/**
 * エラーオブジェクトから適切なAPIエラーレスポンスを作成する
 * try-catch文で使用することを想定
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  console.error(`API Error${context ? ` in ${context}` : ""}:`, error);

  if (error instanceof Error) {
    // 特定のエラーメッセージからエラータイプを判定
    if (error.message.includes("認証") || error.message.includes("auth")) {
      return createUnauthorizedResponse(error.message);
    }
    if (
      error.message.includes("権限") ||
      error.message.includes("permission")
    ) {
      return createForbiddenResponse(error.message);
    }
    if (
      error.message.includes("見つかりません") ||
      error.message.includes("not found")
    ) {
      return createNotFoundResponse(error.message);
    }
    if (
      error.message.includes("バリデーション") ||
      error.message.includes("validation")
    ) {
      return createValidationErrorResponse(error.message);
    }
  }

  // デフォルトでサーバーエラーとして処理
  return createInternalServerErrorResponse(
    error instanceof Error || typeof error === "string" ? error : undefined,
  );
}

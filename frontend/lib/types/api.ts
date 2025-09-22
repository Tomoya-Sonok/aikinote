/**
 * API レスポンスの統一型定義
 * 全てのAPIエンドポイントで一貫したレスポンス形式を使用する
 */

/**
 * 基本的なAPIレスポンス型
 */
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

/**
 * 成功レスポンス型
 */
export interface ApiSuccessResponse<T = any> extends BaseApiResponse {
  success: true;
  data: T;
  message?: string;
}

/**
 * エラーレスポンス型
 */
export interface ApiErrorResponse extends BaseApiResponse {
  success: false;
  error: string;
  details?: Record<string, any>;
  code?: string;
}

/**
 * APIレスポンスの union 型
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * HTTPステータスコードと対応するエラーコード
 */
export const API_ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * 標準化されたエラーメッセージ
 */
export const API_ERROR_MESSAGES = {
  [API_ERROR_CODES.BAD_REQUEST]: "リクエストの形式が正しくありません",
  [API_ERROR_CODES.UNAUTHORIZED]: "認証が必要です",
  [API_ERROR_CODES.FORBIDDEN]: "このリソースへのアクセス権限がありません",
  [API_ERROR_CODES.NOT_FOUND]: "指定されたリソースが見つかりません",
  [API_ERROR_CODES.CONFLICT]: "リソースが競合状態です",
  [API_ERROR_CODES.VALIDATION_ERROR]: "入力内容に誤りがあります",
  [API_ERROR_CODES.INTERNAL_SERVER_ERROR]: "サーバー内部エラーが発生しました",
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: "サービスが一時的に利用できません",
} as const;

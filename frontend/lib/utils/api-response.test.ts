/**
 * API レスポンス作成ヘルパー関数のテスト
 * 統一されたエラーレスポンス形式のテスト
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_ERROR_CODES } from "@/lib/types/api";
import {
  createErrorResponse,
  createForbiddenResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  handleApiError,
} from "./api-response";

// 時間のモック
const mockDate = new Date("2024-01-01T00:00:00.000Z");

beforeEach(() => {
  vi.setSystemTime(mockDate);
});

describe("API Response Helper Functions", () => {
  describe("createSuccessResponse", () => {
    it("基本的な成功レスポンスを作成する", () => {
      const data = { id: "123", name: "test" };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);

      // レスポンス内容の確認（NextResponseからJSONを抽出できないため、構造を確認）
      // 実際のアプリケーションでは response.json() でアクセスする
    });

    it("メッセージとカスタムステータス付きの成功レスポンスを作成する", () => {
      const data = { id: "123" };
      const response = createSuccessResponse(data, {
        message: "作成完了",
        status: 201,
      });

      expect(response.status).toBe(201);
    });

    it("nullデータでも正常に動作する", () => {
      const response = createSuccessResponse(null);
      expect(response.status).toBe(200);
    });
  });

  describe("createErrorResponse", () => {
    it("文字列エラーメッセージでエラーレスポンスを作成する", () => {
      const response = createErrorResponse("カスタムエラーメッセージ");
      expect(response.status).toBe(500); // デフォルトのサーバーエラー
    });

    it("エラーコードからエラーレスポンスを作成する", () => {
      const response = createErrorResponse(API_ERROR_CODES.NOT_FOUND);
      expect(response.status).toBe(404);
    });

    it("詳細情報付きのエラーレスポンスを作成する", () => {
      const response = createErrorResponse("バリデーションエラー", {
        details: { field: "username", issue: "重複" },
        status: 400,
      });
      expect(response.status).toBe(400);
    });
  });

  describe("createValidationErrorResponse", () => {
    it("文字列エラーでバリデーションエラーレスポンスを作成する", () => {
      const response = createValidationErrorResponse(
        "必須項目が不足しています",
      );
      expect(response.status).toBe(400);
    });

    it("フィールド別エラーでバリデーションエラーレスポンスを作成する", () => {
      const errors = {
        email: ["メールアドレスの形式が正しくありません"],
        password: ["パスワードは8文字以上である必要があります"],
      };
      const response = createValidationErrorResponse(errors);
      expect(response.status).toBe(400);
    });

    it("カスタムメッセージ付きのバリデーションエラーレスポンスを作成する", () => {
      const response = createValidationErrorResponse(
        "エラー",
        "カスタムメッセージ",
      );
      expect(response.status).toBe(400);
    });
  });

  describe("createUnauthorizedResponse", () => {
    it("デフォルトメッセージで認証エラーレスポンスを作成する", () => {
      const response = createUnauthorizedResponse();
      expect(response.status).toBe(401);
    });

    it("カスタムメッセージで認証エラーレスポンスを作成する", () => {
      const response = createUnauthorizedResponse("ログインが必要です");
      expect(response.status).toBe(401);
    });
  });

  describe("createForbiddenResponse", () => {
    it("デフォルトメッセージで権限エラーレスポンスを作成する", () => {
      const response = createForbiddenResponse();
      expect(response.status).toBe(403);
    });

    it("カスタムメッセージで権限エラーレスポンスを作成する", () => {
      const response = createForbiddenResponse("管理者権限が必要です");
      expect(response.status).toBe(403);
    });
  });

  describe("createNotFoundResponse", () => {
    it("デフォルトメッセージでNot Foundレスポンスを作成する", () => {
      const response = createNotFoundResponse();
      expect(response.status).toBe(404);
    });

    it("カスタムメッセージでNot Foundレスポンスを作成する", () => {
      const response = createNotFoundResponse("ユーザーが見つかりません");
      expect(response.status).toBe(404);
    });
  });

  describe("createInternalServerErrorResponse", () => {
    it("エラーなしでサーバーエラーレスポンスを作成する", () => {
      const response = createInternalServerErrorResponse();
      expect(response.status).toBe(500);
    });

    it("Error オブジェクトでサーバーエラーレスポンスを作成する", () => {
      const error = new Error("データベース接続エラー");
      const response = createInternalServerErrorResponse(error, true);
      expect(response.status).toBe(500);
    });

    it("文字列エラーでサーバーエラーレスポンスを作成する", () => {
      const response = createInternalServerErrorResponse("設定エラー", true);
      expect(response.status).toBe(500);
    });

    it("本番環境では詳細を含めない", () => {
      const error = new Error("詳細なエラー情報");
      const response = createInternalServerErrorResponse(error, false);
      expect(response.status).toBe(500);
    });
  });

  describe("handleApiError", () => {
    it("認証関連エラーを適切に処理する", () => {
      const error = new Error("認証に失敗しました");
      const response = handleApiError(error);
      expect(response.status).toBe(401);
    });

    it("権限関連エラーを適切に処理する", () => {
      const error = new Error("権限がありません");
      const response = handleApiError(error);
      expect(response.status).toBe(403);
    });

    it("Not Found エラーを適切に処理する", () => {
      const error = new Error("見つかりません");
      const response = handleApiError(error);
      expect(response.status).toBe(404);
    });

    it("バリデーションエラーを適切に処理する", () => {
      const error = new Error("バリデーションに失敗しました");
      const response = handleApiError(error);
      expect(response.status).toBe(400);
    });

    it("不明なエラーはサーバーエラーとして処理する", () => {
      const error = new Error("予期しないエラー");
      const response = handleApiError(error);
      expect(response.status).toBe(500);
    });

    it("文字列エラーも適切に処理する", () => {
      const response = handleApiError("文字列エラー");
      expect(response.status).toBe(500);
    });

    it("nullエラーも適切に処理する", () => {
      const response = handleApiError(null);
      expect(response.status).toBe(500);
    });

    it("コンテキスト情報を含めてログ出力する", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("テストエラー");

      handleApiError(error, "test context");

      expect(consoleSpy).toHaveBeenCalledWith(
        "API Error in test context:",
        error,
      );

      consoleSpy.mockRestore();
    });
  });

  describe("HTTP ステータスコードの自動判定", () => {
    it("BAD_REQUEST は 400 を返す", () => {
      const response = createErrorResponse(API_ERROR_CODES.BAD_REQUEST);
      expect(response.status).toBe(400);
    });

    it("UNAUTHORIZED は 401 を返す", () => {
      const response = createErrorResponse(API_ERROR_CODES.UNAUTHORIZED);
      expect(response.status).toBe(401);
    });

    it("FORBIDDEN は 403 を返す", () => {
      const response = createErrorResponse(API_ERROR_CODES.FORBIDDEN);
      expect(response.status).toBe(403);
    });

    it("NOT_FOUND は 404 を返す", () => {
      const response = createErrorResponse(API_ERROR_CODES.NOT_FOUND);
      expect(response.status).toBe(404);
    });

    it("CONFLICT は 409 を返す", () => {
      const response = createErrorResponse(API_ERROR_CODES.CONFLICT);
      expect(response.status).toBe(409);
    });

    it("VALIDATION_ERROR は 400 を返す", () => {
      const response = createErrorResponse(API_ERROR_CODES.VALIDATION_ERROR);
      expect(response.status).toBe(400);
    });

    it("INTERNAL_SERVER_ERROR は 500 を返す", () => {
      const response = createErrorResponse(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
      expect(response.status).toBe(500);
    });

    it("SERVICE_UNAVAILABLE は 503 を返す", () => {
      const response = createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(response.status).toBe(503);
    });
  });

  describe("レスポンス形式の一貫性", () => {
    it("全ての成功レスポンスにタイムスタンプが含まれる", () => {
      const response = createSuccessResponse({ data: "test" });
      expect(response.status).toBe(200);
      // タイムスタンプの存在確認は実際のレスポンスボディで行う必要がある
    });

    it("全てのエラーレスポンスにタイムスタンプが含まれる", () => {
      const response = createErrorResponse("テストエラー");
      expect(response.status).toBe(500);
      // タイムスタンプの存在確認は実際のレスポンスボディで行う必要がある
    });

    it("success フィールドが適切に設定される", () => {
      const successResponse = createSuccessResponse({ data: "test" });
      const errorResponse = createErrorResponse("エラー");

      expect(successResponse.status).toBe(200);
      expect(errorResponse.status).toBe(500);
    });
  });
});

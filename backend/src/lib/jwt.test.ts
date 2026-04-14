import { describe, expect, it, vi } from "vitest";
import { extractTokenFromHeader, generateToken, verifyToken } from "./jwt.js";

const TEST_ENV = { JWT_SECRET: "test-jwt-secret-key" };

describe("JWT ユーティリティ", () => {
  describe("generateToken", () => {
    it("有効なJWT文字列を生成する（ドット区切り3パート）", async () => {
      // Arrange
      const payload = { userId: "user-1", email: "test@example.com" };

      // Act
      const token = await generateToken(payload, TEST_ENV);

      // Assert: JWT は header.payload.signature の3パート構成
      expect(token.split(".")).toHaveLength(3);
    });

    it("生成したトークンをverifyTokenで復元するとuserId・emailが一致する", async () => {
      // Arrange
      const payload = { userId: "user-1", email: "test@example.com" };

      // Act
      const token = await generateToken(payload, TEST_ENV);
      const decoded = await verifyToken(token, TEST_ENV);

      // Assert
      expect(decoded.userId).toBe("user-1");
      expect(decoded.email).toBe("test@example.com");
    });

    it("exp が現在時刻から24時間後に設定される", async () => {
      // Arrange
      const beforeGenerate = Math.floor(Date.now() / 1000);
      const payload = { userId: "user-1" };

      // Act
      const token = await generateToken(payload, TEST_ENV);
      const decoded = await verifyToken(token, TEST_ENV);

      // Assert: exp は生成時刻 + 86400秒（24時間）付近
      const expectedExp = beforeGenerate + 60 * 60 * 24;
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 2); // 実行時間の誤差許容
    });
  });

  describe("verifyToken", () => {
    it("異なるsecretで署名されたトークンはエラーになる", async () => {
      // Arrange
      const token = await generateToken(
        { userId: "user-1" },
        { JWT_SECRET: "correct-secret" },
      );

      // Act & Assert
      await expect(
        verifyToken(token, { JWT_SECRET: "wrong-secret" }),
      ).rejects.toThrow("Invalid or expired token");
    });

    it("不正な文字列はエラーになる", async () => {
      // Act & Assert
      await expect(
        verifyToken("invalid.token.string", TEST_ENV),
      ).rejects.toThrow("Invalid or expired token");
    });
  });

  describe("extractTokenFromHeader", () => {
    it("'Bearer xxx'形式のヘッダーからトークン部分を抽出する", () => {
      // Arrange
      const header = "Bearer my-jwt-token";

      // Act
      const token = extractTokenFromHeader(header);

      // Assert
      expect(token).toBe("my-jwt-token");
    });

    it("Authorizationヘッダーがundefinedの場合はエラーになる", () => {
      // Act & Assert
      expect(() => extractTokenFromHeader(undefined)).toThrow(
        "Authorization header missing",
      );
    });

    it("Bearer プレフィックスがない場合はエラーになる", () => {
      // Act & Assert
      expect(() => extractTokenFromHeader("Basic credentials")).toThrow(
        "Invalid authorization format",
      );
    });

    it("空文字列の場合はエラーになる", () => {
      // Act & Assert
      expect(() => extractTokenFromHeader("")).toThrow(
        "Authorization header missing",
      );
    });
  });

  describe("getSecret", () => {
    it("JWT_SECRETが未設定の場合はエラーになる", async () => {
      // Act & Assert
      await expect(
        generateToken({ userId: "user-1" }, { JWT_SECRET: undefined }),
      ).rejects.toThrow("JWT secret is not configured");
    });

    it("envが未定義の場合はprocess.envにフォールバックする", async () => {
      // Arrange
      vi.stubEnv("JWT_SECRET", "process-env-secret");

      // Act
      const token = await generateToken({ userId: "user-1" }, undefined);

      // Assert: トークンが生成される（process.envから取得）
      expect(token.split(".")).toHaveLength(3);

      // Cleanup
      vi.unstubAllEnvs();
    });
  });
});

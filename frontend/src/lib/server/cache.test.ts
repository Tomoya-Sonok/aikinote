import { revalidateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserInfoFromHono } from "./auth";
import {
  getCachedUserInfo,
  getUserInfoCacheTag,
  revalidateUserInfo,
} from "./cache";

// モジュール全体のモック
// "use cache" ディレクティブは SWC 変換が走らない vitest 環境では
// 単なる文字列リテラルとして扱われ実行に影響しない。cacheLife / cacheTag は
// no-op mock で実行時エラーを防ぐ
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("./auth", () => ({
  fetchUserInfoFromHono: vi.fn(),
}));

describe("cache.ts", () => {
  const userId = "test-user-id";
  // biome-ignore lint/suspicious/noExplicitAny: mock data
  const mockUser: any = { id: userId, email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedUserInfo", () => {
    it("fetches user info via use cache directive with primitive args", async () => {
      const mockProfile = { id: userId, username: "testuser" };
      // biome-ignore lint/suspicious/noExplicitAny: mock function
      (fetchUserInfoFromHono as any).mockResolvedValue(mockProfile);

      const result = await getCachedUserInfo(userId, mockUser);

      // userOverride が { id, email } の plain object として渡されることを確認
      // (User 型まるごとではなくプリミティブ展開で cache key の安定性を担保)
      expect(fetchUserInfoFromHono).toHaveBeenCalledWith(userId, {
        id: userId,
        email: "test@example.com",
      });
      expect(result).toEqual(mockProfile);
    });
  });

  describe("revalidateUserInfo", () => {
    it("calls revalidateTag with the user-specific tag and 'max' profile", () => {
      revalidateUserInfo(userId);

      expect(revalidateTag).toHaveBeenCalledWith(
        getUserInfoCacheTag(userId),
        "max",
      );
    });
  });
});

import { revalidateTag, unstable_cache } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserInfoFromHono } from "./auth";
import {
  getCachedUserInfo,
  getUserInfoCacheTag,
  revalidateUserInfo,
} from "./cache";

// モジュール全体のモック
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn), // 単に実行するだけにモック
}));

vi.mock("./auth", () => ({
  fetchUserInfoFromHono: vi.fn(),
}));

describe("cache.ts", () => {
  const userId = "test-user-id";
  // biome-ignore lint/suspicious/noExplicitAny: mock data
  const mockSession: any = { user: { id: userId } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedUserInfo", () => {
    it("fetches user info via unstable_cache", async () => {
      const mockProfile = { id: userId, username: "testuser" };
      // biome-ignore lint/suspicious/noExplicitAny: mock function
      (fetchUserInfoFromHono as any).mockResolvedValue(mockProfile);

      // biome-ignore lint/suspicious/noExplicitAny: mock function
      (unstable_cache as any).mockImplementation((fn: any) => fn);

      const result = await getCachedUserInfo(userId, mockSession);

      expect(unstable_cache).toHaveBeenCalled();
      expect(fetchUserInfoFromHono).toHaveBeenCalledWith(userId, mockSession);
      expect(result).toEqual(mockProfile);
    });
  });

  describe("revalidateUserInfo", () => {
    it("calls revalidateTag with correct tag", () => {
      revalidateUserInfo(userId);

      expect(revalidateTag).toHaveBeenCalledWith(getUserInfoCacheTag(userId));
    });
  });
});

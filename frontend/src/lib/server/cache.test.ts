import { revalidateTag, unstable_cache } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserBasicInfoFromHono } from "./auth";
import {
  getCachedUserBasicInfo,
  getUserBasicInfoCacheTag,
  revalidateUserBasicInfo,
} from "./cache";

// モジュール全体のモック
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn), // 単に実行するだけにモック
}));

vi.mock("./auth", () => ({
  fetchUserBasicInfoFromHono: vi.fn(),
}));

describe("cache.ts", () => {
  const userId = "test-user-id";
  // biome-ignore lint/suspicious/noExplicitAny: mock data
  const mockSession: any = { user: { id: userId } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedUserBasicInfo", () => {
    it("fetches user basic info via unstable_cache", async () => {
      const mockProfile = { id: userId, username: "testuser" };
      // biome-ignore lint/suspicious/noExplicitAny: mock function
      (fetchUserBasicInfoFromHono as any).mockResolvedValue(mockProfile);

      // biome-ignore lint/suspicious/noExplicitAny: mock function
      (unstable_cache as any).mockImplementation((fn: any) => fn);

      const result = await getCachedUserBasicInfo(userId, mockSession);

      expect(unstable_cache).toHaveBeenCalled();
      expect(fetchUserBasicInfoFromHono).toHaveBeenCalledWith(
        userId,
        mockSession,
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe("revalidateUserBasicInfo", () => {
    it("calls revalidateTag with correct tag", () => {
      revalidateUserBasicInfo(userId);

      expect(revalidateTag).toHaveBeenCalledWith(
        getUserBasicInfoCacheTag(userId),
      );
    });
  });
});

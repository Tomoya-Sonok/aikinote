import { revalidateTag, unstable_cache } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserProfileFromHono } from "@/lib/server/auth";
import {
  getCachedUserProfile,
  getUserProfileCacheTag,
  revalidateUserProfile,
} from "@/lib/server/cache";

// モジュール全体のモック
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn), // 単に実行するだけにモック
}));

vi.mock("@/lib/server/auth", () => ({
  fetchUserProfileFromHono: vi.fn(),
}));

describe("cache.ts", () => {
  const userId = "test-user-id";
  const mockSession: any = { user: { id: userId } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedUserProfile", () => {
    it("fetches user profile via unstable_cache", async () => {
      const mockProfile = { id: userId, username: "testuser" };
      (fetchUserProfileFromHono as any).mockResolvedValue(mockProfile);

      (unstable_cache as any).mockImplementation((fn: any) => fn);

      const result = await getCachedUserProfile(userId, mockSession);

      expect(unstable_cache).toHaveBeenCalled();
      expect(fetchUserProfileFromHono).toHaveBeenCalledWith(
        userId,
        mockSession,
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe("revalidateUserProfile", () => {
    it("calls revalidateTag with correct tag", () => {
      revalidateUserProfile(userId);

      expect(revalidateTag).toHaveBeenCalledWith(
        getUserProfileCacheTag(userId),
      );
    });
  });
});

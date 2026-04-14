import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import socialFavoritesRoute from "./index.js";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

const mockGetSocialPostById = vi.fn();
const mockToggleSocialFavorite = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockIsPremiumUser = vi.fn();

vi.mock("../../lib/supabase.js", () => ({
  getSocialPostById: (...args: unknown[]) => mockGetSocialPostById(...args),
  toggleSocialFavorite: (...args: unknown[]) =>
    mockToggleSocialFavorite(...args),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  createNotification: vi.fn(),
  deleteNotificationByFavorite: vi.fn(),
  getSocialReplyById: vi.fn(),
  toggleReplyFavorite: vi.fn(),
  deleteNotificationByReplyFavorite: vi.fn(),
}));

vi.mock("../../lib/subscription.js", () => ({
  isPremiumUser: (...args: unknown[]) => mockIsPremiumUser(...args),
}));

vi.mock("../../lib/push-notification.js", () => ({
  sendPushToUser: vi.fn(),
}));

vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
vi.stubEnv("JWT_SECRET", "test-jwt-secret");

const TEST_ENV = { JWT_SECRET: "test-jwt-secret" };
const TEST_USER_ID = "test-user-id";

const createTestApp = () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.route("/api/social-favorites", socialFavoritesRoute);
  return app;
};

const createAuthHeaders = async () => {
  const token = await generateToken({ userId: TEST_USER_ID }, TEST_ENV);
  return { Authorization: `Bearer ${token}` };
};

describe("投稿お気に入りトグル POST /api/social-favorites/:postId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPremiumUser.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue(false);
  });

  it("投稿が見つからない場合は404を返す", async () => {
    // Arrange
    mockGetSocialPostById.mockResolvedValue(null);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-favorites/post-1", {
      method: "POST",
      headers,
    });

    // Assert
    expect(res.status).toBe(404);
  });

  it("Freeユーザーが1日5件超のお気に入り登録で429を返す", async () => {
    // Arrange
    mockGetSocialPostById.mockResolvedValue({
      id: "post-1",
      user_id: "other-user",
    });
    // 未お気に入り状態
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });
    mockIsPremiumUser.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue(true); // 制限到達

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-favorites/post-1", {
      method: "POST",
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(429);
    expect(body.code).toBe("DAILY_LIMIT_REACHED");
  });

  it("お気に入り解除時はレート制限チェックをスキップする", async () => {
    // Arrange: 既にお気に入り済み
    mockGetSocialPostById.mockResolvedValue({
      id: "post-1",
      user_id: "other-user",
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "fav-1" } }),
          }),
        }),
      }),
    });
    mockToggleSocialFavorite.mockResolvedValue({ is_favorited: false });

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-favorites/post-1", {
      method: "POST",
      headers,
    });

    // Assert: レート制限チェックが呼ばれない
    expect(res.status).toBe(200);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("Premiumユーザーはレート制限なしでお気に入り登録できる", async () => {
    // Arrange
    mockGetSocialPostById.mockResolvedValue({
      id: "post-1",
      user_id: "other-user",
      favorite_count: 1,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });
    mockIsPremiumUser.mockResolvedValue(true);
    mockToggleSocialFavorite.mockResolvedValue({ is_favorited: true });

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-favorites/post-1", {
      method: "POST",
      headers,
    });

    // Assert
    expect(res.status).toBe(200);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

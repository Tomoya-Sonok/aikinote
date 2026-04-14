import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import socialSearchRoute from "./index.js";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
const mockSearchSocialPosts = vi.fn();
const mockEnrichSocialPosts = vi.fn();
const mockGetTrendingHashtags = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("../../lib/supabase.js", () => ({
  searchSocialPosts: (...args: unknown[]) => mockSearchSocialPosts(...args),
  enrichSocialPosts: (...args: unknown[]) => mockEnrichSocialPosts(...args),
  getTrendingHashtags: (...args: unknown[]) => mockGetTrendingHashtags(...args),
}));

vi.mock("../../lib/subscription.js", () => ({
  isPremiumUser: vi.fn().mockResolvedValue(true),
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
  app.route("/api/social-search", socialSearchRoute);
  return app;
};

const createAuthHeaders = async (userId = TEST_USER_ID) => {
  const token = await generateToken({ userId }, TEST_ENV);
  return { Authorization: `Bearer ${token}` };
};

describe("投稿検索 GET /api/social-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { dojo_style_id: "dojo-1" },
            error: null,
          }),
        }),
      }),
    });
  });

  it("user_idが認証ユーザーと不一致の場合は403を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(
      "/api/social-search?user_id=other-user&query=test",
      { headers },
    );

    // Assert
    expect(res.status).toBe(403);
  });

  it("正常に検索結果が返される", async () => {
    // Arrange
    mockSearchSocialPosts.mockResolvedValue([{ id: "post-1" }]);
    mockEnrichSocialPosts.mockResolvedValue([{ id: "post-1", enriched: true }]);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(
      `/api/social-search?user_id=${TEST_USER_ID}&query=合気道`,
      { headers },
    );
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe("トレンドハッシュタグ GET /api/social-search/trending", () => {
  beforeEach(() => vi.clearAllMocks());

  it("トレンドハッシュタグが取得できる", async () => {
    // Arrange
    mockGetTrendingHashtags.mockResolvedValue([{ name: "合気道", count: 10 }]);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-search/trending", {
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

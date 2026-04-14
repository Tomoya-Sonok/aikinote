import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import socialPostsRoute from "./index.js";

// Supabaseモック
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
} as unknown as SupabaseClient;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// 外部モジュールのモック
const mockCreateSocialPost = vi.fn();
const mockGetSocialFeed = vi.fn();
const mockEnrichSocialPosts = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockIsPremiumUser = vi.fn();
const mockContainsNgWord = vi.fn();
const mockCreateSocialPostTags = vi.fn();
const mockUpsertHashtags = vi.fn();
const mockCreateSocialPostHashtags = vi.fn();
const mockGetSourcePageData = vi.fn();
const mockGetUserPublicityDojos = vi.fn();

vi.mock("../../lib/supabase.js", () => ({
  createSocialPost: (...args: unknown[]) => mockCreateSocialPost(...args),
  getSocialFeed: (...args: unknown[]) => mockGetSocialFeed(...args),
  enrichSocialPosts: (...args: unknown[]) => mockEnrichSocialPosts(...args),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  createSocialPostTags: (...args: unknown[]) =>
    mockCreateSocialPostTags(...args),
  upsertHashtags: (...args: unknown[]) => mockUpsertHashtags(...args),
  createSocialPostHashtags: (...args: unknown[]) =>
    mockCreateSocialPostHashtags(...args),
  getSourcePageData: (...args: unknown[]) => mockGetSourcePageData(...args),
  getUserPublicityDojos: (...args: unknown[]) =>
    mockGetUserPublicityDojos(...args),
  getSocialPostById: vi.fn(),
  getSocialPostWithDetails: vi.fn(),
  getSocialPostWithDetailsPublic: vi.fn(),
  getSocialReplyById: vi.fn(),
  createSocialReply: vi.fn(),
  softDeleteSocialPost: vi.fn(),
  softDeleteSocialReply: vi.fn(),
  updateSocialPost: vi.fn(),
  updateSocialPostTags: vi.fn(),
  updateSocialPostHashtags: vi.fn(),
  updateSocialReply: vi.fn(),
  createNotification: vi.fn(),
  getCountInWindow: vi.fn(),
}));

vi.mock("../../lib/subscription.js", () => ({
  isPremiumUser: (...args: unknown[]) => mockIsPremiumUser(...args),
}));

vi.mock("../../lib/ng-word.js", () => ({
  containsNgWord: (...args: unknown[]) => mockContainsNgWord(...args),
}));

vi.mock("../../lib/push-notification.js", () => ({
  sendPushToUser: vi.fn(),
  sendPushToUsers: vi.fn(),
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
  app.route("/api/social-posts", socialPostsRoute);
  return app;
};

const createAuthHeaders = async (userId = TEST_USER_ID) => {
  const token = await generateToken({ userId }, TEST_ENV);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

/** User情報取得をモック（投稿作成時に呼ばれる） */
const setupUserMock = (overrides: Record<string, unknown> = {}) => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "User") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                publicity_setting: "public",
                dojo_style_id: "dojo-1",
                dojo_style_name: "テスト道場",
                ...overrides,
              },
              error: null,
            }),
          }),
        }),
      };
    }
    return { select: vi.fn() };
  });
};

describe("投稿作成 POST /api/social-posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPremiumUser.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue(false);
    mockContainsNgWord.mockResolvedValue({ found: false });
    setupUserMock();
  });

  it("有効な入力で投稿が作成され201を返す", async () => {
    // Arrange
    const mockPost = {
      id: "post-1",
      content: "今日の稽古は最高でした",
      user_id: TEST_USER_ID,
      post_type: "post",
    };
    mockCreateSocialPost.mockResolvedValue(mockPost);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        content: "今日の稽古は最高でした",
        post_type: "post",
      }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("post-1");
  });

  it("認証ユーザーと投稿user_idが不一致の場合は403を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: "other-user",
        content: "テスト",
        post_type: "post",
      }),
    });

    // Assert
    expect(res.status).toBe(403);
  });

  it("Freeユーザーが1日3件目を超えた場合は429を返す", async () => {
    // Arrange: 1日の投稿制限に達している
    mockIsPremiumUser.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValueOnce(true); // 1日3件制限にヒット
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        content: "テスト",
        post_type: "post",
      }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(429);
    expect(body.code).toBe("DAILY_LIMIT_REACHED");
  });

  it("Premiumユーザーは1日の投稿制限がスキップされる", async () => {
    // Arrange
    mockIsPremiumUser.mockResolvedValue(true);
    mockCheckRateLimit.mockResolvedValue(false); // 60分制限のみチェック
    const mockPost = { id: "post-1", content: "テスト", user_id: TEST_USER_ID };
    mockCreateSocialPost.mockResolvedValue(mockPost);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        content: "テスト",
        post_type: "post",
      }),
    });

    // Assert: 201成功、かつcheckRateLimitが1回のみ呼ばれる（60分制限のみ）
    expect(res.status).toBe(201);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    // 60分/10件のレート制限のみ呼ばれる
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      "SocialPost",
      60,
      10,
    );
  });

  it("60分以内に10件以上投稿した場合は429を返す", async () => {
    // Arrange
    mockIsPremiumUser.mockResolvedValue(true);
    mockCheckRateLimit.mockResolvedValue(true); // 60分制限にヒット
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        content: "テスト",
        post_type: "post",
      }),
    });

    // Assert
    expect(res.status).toBe(429);
  });

  it("NGワードが検出された場合は投稿は成功するがwarningが返る", async () => {
    // Arrange
    mockContainsNgWord.mockResolvedValue({
      found: true,
      matchedWord: "禁止語",
    });
    const mockPost = {
      id: "post-1",
      content: "テスト",
      user_id: TEST_USER_ID,
    };
    mockCreateSocialPost.mockResolvedValue(mockPost);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        content: "テスト",
        post_type: "post",
      }),
    });
    const body = await res.json();

    // Assert: 投稿は成功（201）、warningフィールドが存在
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.warning).toBeDefined();
  });

  it("ハッシュタグを含む投稿でupsertHashtagsが呼ばれる", async () => {
    // Arrange
    const mockPost = {
      id: "post-1",
      content: "#合気道 の稽古",
      user_id: TEST_USER_ID,
    };
    mockCreateSocialPost.mockResolvedValue(mockPost);
    mockUpsertHashtags.mockResolvedValue([{ id: "ht-1", name: "合気道" }]);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        content: "#合気道 の稽古",
        post_type: "post",
      }),
    });

    // Assert
    expect(res.status).toBe(201);
    expect(mockUpsertHashtags).toHaveBeenCalledWith(expect.anything(), [
      "合気道",
    ]);
    expect(mockCreateSocialPostHashtags).toHaveBeenCalledWith(
      expect.anything(),
      "post-1",
      ["ht-1"],
    );
  });

  it("バリデーションエラー（content空）の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        content: "",
        post_type: "post",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });
});

describe("フィード取得 GET /api/social-posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUserMock();
  });

  it("認証済みユーザーがフィードを取得すると200を返す", async () => {
    // Arrange
    const mockPosts = [
      { id: "post-1", content: "テスト投稿", user_id: "other-user" },
    ];
    mockGetSocialFeed.mockResolvedValue(mockPosts);
    mockEnrichSocialPosts.mockResolvedValue(mockPosts);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(
      `/api/social-posts?user_id=${TEST_USER_ID}&tab=all&limit=20&offset=0`,
      { headers },
    );
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("Authorizationヘッダーなしの場合は401を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request(
      `/api/social-posts?user_id=${TEST_USER_ID}&tab=all`,
    );

    // Assert
    expect(res.status).toBe(401);
  });
});

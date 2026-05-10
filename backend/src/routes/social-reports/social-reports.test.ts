import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import socialReportsRoute from "./index.js";

// 通知準備で呼ばれる supabase.from(...).select(...).eq(...).maybeSingle() チェーンをモック化。
// 既存の通報フローテストでは通知側の値はテスト対象外なので、空チェーンを返すだけで十分。
const mockFrom = vi.fn().mockImplementation(() => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
const mockCreatePostReport = vi.fn();
const mockNotifyReportEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("../../lib/supabase.js", () => ({
  createPostReport: (...args: unknown[]) => mockCreatePostReport(...args),
}));

vi.mock("../../lib/report-notification.js", () => ({
  notifyReportEmail: (...args: unknown[]) => mockNotifyReportEmail(...args),
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
  app.route("/api/social-reports", socialReportsRoute);
  return app;
};

const createAuthHeaders = async (userId = TEST_USER_ID) => {
  const token = await generateToken({ userId }, TEST_ENV);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

describe("投稿通報 POST /api/social-reports/posts/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("通報が正常に作成され201を返す", async () => {
    // Arrange
    mockCreatePostReport.mockResolvedValue({ id: "report-1" });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-reports/posts/post-1", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        reason: "spam",
      }),
    });

    // Assert
    expect(res.status).toBe(201);
  });

  it("user_idが認証ユーザーと不一致の場合は403を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-reports/posts/post-1", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: "other-user",
        reason: "spam",
      }),
    });

    // Assert
    expect(res.status).toBe(403);
  });

  it("同一投稿への重複通報は409を返す", async () => {
    // Arrange
    mockCreatePostReport.mockRejectedValue(new Error("DUPLICATE_REPORT"));
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-reports/posts/post-1", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        reason: "harassment",
      }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(409);
    expect(body.error).toBe("既に通報済みです");
    // 重複時は通知も送らない
    expect(mockNotifyReportEmail).not.toHaveBeenCalled();
  });

  it("通報成功時に notifyReportEmail が呼ばれる", async () => {
    // Arrange
    mockCreatePostReport.mockResolvedValue({ id: "report-1" });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-reports/posts/post-2", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        reason: "inappropriate",
        detail: "テスト詳細",
      }),
    });

    // Assert
    expect(res.status).toBe(201);
    expect(mockNotifyReportEmail).toHaveBeenCalledTimes(1);
    const [params] = mockNotifyReportEmail.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(params.type).toBe("post");
    expect(params.reportId).toBe("report-1");
    expect(params.reason).toBe("inappropriate");
    expect(params.detail).toBe("テスト詳細");
  });

  it("通知でエラーが起きても通報レスポンスは201で返る", async () => {
    // Arrange
    mockCreatePostReport.mockResolvedValue({ id: "report-1" });
    mockNotifyReportEmail.mockImplementationOnce(() => {
      throw new Error("Resend down");
    });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social-reports/posts/post-3", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        reason: "spam",
      }),
    });

    // Assert
    expect(res.status).toBe(201);
  });
});

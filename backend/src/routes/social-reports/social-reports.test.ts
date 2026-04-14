import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import socialReportsRoute from "./index.js";

const mockSupabase = {} as unknown as SupabaseClient;
const mockCreatePostReport = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("../../lib/supabase.js", () => ({
  createPostReport: (...args: unknown[]) => mockCreatePostReport(...args),
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
  });
});

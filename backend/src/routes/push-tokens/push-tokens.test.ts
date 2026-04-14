import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import pushTokensRoute from "./index.js";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
vi.stubEnv("JWT_SECRET", "test-jwt-secret");

const TEST_ENV = { JWT_SECRET: "test-jwt-secret" };

const createTestApp = () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.route("/api/push-tokens", pushTokensRoute);
  return app;
};

const createAuthHeaders = async () => {
  const token = await generateToken({ userId: "user-1" }, TEST_ENV);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

describe("プッシュトークン登録 POST /api/push-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("expo_push_tokenが未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/push-tokens", {
      method: "POST",
      headers,
      body: JSON.stringify({ platform: "ios" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("platformが未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/push-tokens", {
      method: "POST",
      headers,
      body: JSON.stringify({ expo_push_token: "token-1" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("platformがios/android以外の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/push-tokens", {
      method: "POST",
      headers,
      body: JSON.stringify({ expo_push_token: "token-1", platform: "web" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("有効な入力で登録が成功する", async () => {
    // Arrange
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/push-tokens", {
      method: "POST",
      headers,
      body: JSON.stringify({ expo_push_token: "token-1", platform: "ios" }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe("プッシュトークン削除 DELETE /api/push-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("expo_push_tokenが未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/push-tokens", {
      method: "DELETE",
      headers,
      body: JSON.stringify({}),
    });

    // Assert
    expect(res.status).toBe(400);
  });
});

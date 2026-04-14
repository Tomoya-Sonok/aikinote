import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import statsRoute from "./index.js";

const mockSupabase = {} as unknown as SupabaseClient;
const mockIsPremiumUser = vi.fn();
const mockGetTrainingStats = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("../../lib/subscription.js", () => ({
  isPremiumUser: (...args: unknown[]) => mockIsPremiumUser(...args),
}));

vi.mock("../../lib/supabase.js", () => ({
  getTrainingStats: (...args: unknown[]) => mockGetTrainingStats(...args),
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
  app.route("/api/stats", statsRoute);
  return app;
};

const createAuthHeaders = async (userId = TEST_USER_ID) => {
  const token = await generateToken({ userId }, TEST_ENV);
  return { Authorization: `Bearer ${token}` };
};

describe("統計データ取得 GET /api/stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Premiumユーザーが統計データを取得すると200を返す", async () => {
    // Arrange
    mockIsPremiumUser.mockResolvedValue(true);
    mockGetTrainingStats.mockResolvedValue({ total_pages: 10 });
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/stats?user_id=${TEST_USER_ID}`, {
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("Freeユーザーは403とPREMIUM_REQUIREDコードを返す", async () => {
    // Arrange
    mockIsPremiumUser.mockResolvedValue(false);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/stats?user_id=${TEST_USER_ID}`, {
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(403);
    expect(body.code).toBe("PREMIUM_REQUIRED");
  });

  it("user_idが認証ユーザーと不一致の場合は403を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/stats?user_id=other-user", {
      headers,
    });

    // Assert
    expect(res.status).toBe(403);
  });
});

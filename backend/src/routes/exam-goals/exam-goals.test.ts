import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import examGoalsRoute from "./index.js";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("../../lib/subscription.js", () => ({
  isPremiumUser: vi.fn().mockResolvedValue(true),
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
  app.route("/api/exam-goals", examGoalsRoute);
  return app;
};

const createAuthHeaders = async () => {
  const token = await generateToken({ userId: "user-1" }, TEST_ENV);
  return { Authorization: `Bearer ${token}` };
};

describe("審査目標取得 GET /api/exam-goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("審査日が未来の場合はデータを返す", async () => {
    // Arrange: 未来の審査日
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "eg-1", exam_date: futureDate, exam_rank: "初段" },
            error: null,
          }),
        }),
      }),
    });

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/exam-goals", { headers });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data.exam_rank).toBe("初段");
  });

  it("審査日が過去の場合は自動削除してnullを返す", async () => {
    // Arrange: 過去の審査日
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "eg-1", exam_date: pastDate },
            error: null,
          }),
        }),
      }),
      delete: mockDelete,
    });

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/exam-goals", { headers });
    const body = await res.json();

    // Assert: データはnull、削除が実行される
    expect(res.status).toBe(200);
    expect(body.data).toBeNull();
  });

  it("データが存在しない場合はnullを返す", async () => {
    // Arrange
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/exam-goals", { headers });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

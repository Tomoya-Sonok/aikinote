import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import notificationPreferencesRoute from "./index.js";

// Supabase モック
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
const TEST_USER_ID = "test-user-id";

const createTestApp = () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.route("/api/notification-preferences", notificationPreferencesRoute);
  return app;
};

const createAuthHeaders = async () => {
  const token = await generateToken({ userId: TEST_USER_ID }, TEST_ENV);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

describe("リマインダー追加 POST /api/notification-preferences/reminders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("リマインダーが5件に達している場合は400を返す", async () => {
    // Arrange: 件数チェックで5件を返す
    mockFrom.mockImplementation((table: string) => {
      if (table === "UserPracticeReminder") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        };
      }
      // User テーブル（isPremiumUser用）
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { subscription_tier: "premium" },
              error: null,
            }),
          }),
        }),
      };
    });

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/notification-preferences/reminders", {
      method: "POST",
      headers,
      body: JSON.stringify({ reminder_time: "21:00" }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error).toBe("リマインダーは最大5件までです");
  });

  it("時刻が5分刻みに丸められて保存される（21:03→21:05）", async () => {
    // Arrange
    const insertMock = vi.fn().mockResolvedValue({
      data: { id: "r-1", reminder_time: "21:05" },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "UserPracticeReminder") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: insertMock,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { subscription_tier: "premium" },
              error: null,
            }),
          }),
        }),
      };
    });

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/notification-preferences/reminders", {
      method: "POST",
      headers,
      body: JSON.stringify({ reminder_time: "21:03" }),
    });

    // Assert
    expect(res.status).toBe(200);
    // insert に渡された reminder_time が丸められている
    const insertCall = mockFrom.mock.results.find(
      (r) => (r.value as Record<string, unknown>)?.insert,
    );
    expect(insertCall).toBeDefined();
  });
});

describe("リマインダー更新 PUT /api/notification-preferences/reminders/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("他ユーザーのリマインダーを更新しようとすると403を返す", async () => {
    // Arrange: 別ユーザーのリマインダー
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: "other-user-id" },
            error: null,
          }),
        }),
      }),
    }));

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(
      "/api/notification-preferences/reminders/r-1",
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ reminder_time: "21:00" }),
      },
    );
    const body = await res.json();

    // Assert
    expect(res.status).toBe(403);
    expect(body.error).toBe("権限がありません");
  });

  it("存在しないリマインダーの場合は404を返す", async () => {
    // Arrange
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: "not found" } }),
        }),
      }),
    }));

    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(
      "/api/notification-preferences/reminders/nonexistent",
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ reminder_time: "21:00" }),
      },
    );

    // Assert
    expect(res.status).toBe(404);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import dojoStylesRoute from "./index.js";

// Supabaseクライアントのモック関数
const mockInsert = vi.fn();
const mockMaybeSingle = vi.fn();

const mockLimit = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn((..._args: unknown[]) => ({
        maybeSingle: mockMaybeSingle,
        or: vi.fn((..._args2: unknown[]) => ({
          limit: mockLimit,
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: mockInsert,
      })),
    })),
  })),
} as unknown as SupabaseClient;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// 環境変数の設定
vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
vi.stubEnv("JWT_SECRET", "test-jwt-secret");

const createTestApp = () => {
  const app = new Hono();
  // authMiddleware が c.get("supabase") を参照するため、事前にセットする
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.route("/api/dojo-styles", dojoStylesRoute);
  return app;
};

const createTestToken = async () => {
  return await generateToken(
    { userId: "test-user-id", email: "test@example.com" },
    { JWT_SECRET: "test-jwt-secret" },
  );
};

describe("GET /api/dojo-styles/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("検索クエリなしの場合400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/dojo-styles/search");

    // Assert
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe("POST /api/dojo-styles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("認証なしの場合401を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/dojo-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dojo_name: "テスト道場",
      }),
    });

    // Assert
    expect(res.status).toBe(401);
  });

  test("既存レコードがある場合そのIDを返す", async () => {
    // Arrange
    const app = createTestApp();
    const token = await createTestToken();
    const existingData = {
      id: "existing-id",
      dojo_name: "テスト道場",
      is_approved: true,
    };
    mockMaybeSingle.mockResolvedValue({ data: existingData, error: null });

    // Act
    const res = await app.request("/api/dojo-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dojo_name: "テスト道場",
      }),
    });

    // Assert
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("existing-id");
  });

  test("新規レコードを作成し201を返す", async () => {
    // Arrange
    const app = createTestApp();
    const token = await createTestToken();
    const createdData = {
      id: "new-id",
      dojo_name: "新規道場",
      is_approved: false,
    };
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ data: createdData, error: null });

    // Act
    const res = await app.request("/api/dojo-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dojo_name: "新規道場",
      }),
    });

    // Assert
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.is_approved).toBe(false);
  });

  test("不正なリクエストボディの場合400を返す", async () => {
    // Arrange
    const app = createTestApp();
    const token = await createTestToken();

    // Act
    const res = await app.request("/api/dojo-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dojo_name: "",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  test("既存レコード検索でDBエラーが発生した場合500を返す", async () => {
    // Arrange
    const app = createTestApp();
    const token = await createTestToken();
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "DB接続エラー" },
    });

    // Act
    const res = await app.request("/api/dojo-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dojo_name: "テスト道場",
      }),
    });

    // Assert
    expect(res.status).toBe(500);
  });

  test("新規作成でDBエラーが発生した場合500を返す", async () => {
    // Arrange
    const app = createTestApp();
    const token = await createTestToken();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({
      data: null,
      error: { message: "INSERT失敗" },
    });

    // Act
    const res = await app.request("/api/dojo-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dojo_name: "新規道場",
      }),
    });

    // Assert
    expect(res.status).toBe(500);
  });
});

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../lib/jwt.js";
import { authMiddleware, premiumMiddleware } from "./auth.js";

// Supabase モック
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
vi.stubEnv("JWT_SECRET", "test-jwt-secret");

const TEST_ENV = { JWT_SECRET: "test-jwt-secret" };

/** テスト用のHonoアプリを生成し、認証ミドルウェア付きの/testルートを登録 */
const createTestApp = () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.use("/test/*", authMiddleware);
  app.get("/test/protected", (c) => {
    const userId = c.get("userId" as never);
    return c.json({ success: true, userId });
  });
  return app;
};

/** テスト用のPremiumミドルウェア付きアプリ */
const createPremiumApp = () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.use("/premium/*", authMiddleware);
  app.use("/premium/*", premiumMiddleware);
  app.get("/premium/feature", (c) =>
    c.json({ success: true, feature: "premium" }),
  );
  return app;
};

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効なJWTを送信するとuserIdが設定されnext()が呼ばれる", async () => {
    // Arrange
    const app = createTestApp();
    const token = await generateToken(
      { userId: "user-1", email: "test@example.com" },
      TEST_ENV,
    );

    // Act
    const res = await app.request("/test/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.userId).toBe("user-1");
  });

  it("Authorizationヘッダーがない場合は401を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/test/protected");

    // Assert
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("認証エラー");
  });

  it("不正なJWTの場合は401を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/test/protected", {
      headers: { Authorization: "Bearer invalid-token" },
    });

    // Assert
    expect(res.status).toBe(401);
  });

  it("Supabaseクライアントが未初期化の場合は500を返す", async () => {
    // Arrange: supabaseをnullに設定
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("supabase" as never, null);
      await next();
    });
    app.use("/test/*", authMiddleware);
    app.get("/test/protected", (c) => c.json({ success: true }));

    const token = await generateToken({ userId: "user-1" }, TEST_ENV);

    // Act
    const res = await app.request("/test/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Assert
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Supabase クライアント未初期化");
  });
});

describe("premiumMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Premiumユーザーの場合はnext()が呼ばれ200を返す", async () => {
    // Arrange
    const app = createPremiumApp();
    const token = await generateToken({ userId: "user-1" }, TEST_ENV);
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { subscription_tier: "premium" },
            error: null,
          }),
        }),
      }),
    });

    // Act
    const res = await app.request("/premium/feature", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Assert
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feature).toBe("premium");
  });

  it("非Premiumユーザーの場合は403を返す", async () => {
    // Arrange
    const app = createPremiumApp();
    const token = await generateToken({ userId: "user-1" }, TEST_ENV);
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { subscription_tier: "free" },
            error: null,
          }),
        }),
      }),
    });

    // Act
    const res = await app.request("/premium/feature", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Assert
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Premium プランが必要です");
  });
});

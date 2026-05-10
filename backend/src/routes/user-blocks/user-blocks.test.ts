import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../lib/jwt.js";
import userBlocksRoute from "./index.js";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

const mockCreateUserBlock = vi.fn();
const mockDeleteUserBlock = vi.fn();
const mockGetUserBlocks = vi.fn();

vi.mock("../../lib/supabase.js", () => ({
  createUserBlock: (...args: unknown[]) => mockCreateUserBlock(...args),
  deleteUserBlock: (...args: unknown[]) => mockDeleteUserBlock(...args),
  getUserBlocks: (...args: unknown[]) => mockGetUserBlocks(...args),
}));

vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
vi.stubEnv("JWT_SECRET", "test-jwt-secret");

const TEST_ENV = { JWT_SECRET: "test-jwt-secret" };
const TEST_USER_ID = "test-user-id";
const TARGET_USER_ID = "target-user-id";

const createTestApp = () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("supabase" as never, mockSupabase);
    await next();
  });
  app.route("/api/social/blocks", userBlocksRoute);
  return app;
};

const createAuthHeaders = async (userId = TEST_USER_ID) => {
  const token = await generateToken({ userId }, TEST_ENV);
  return { Authorization: `Bearer ${token}` };
};

/** User テーブル参照を targetUser がある状態でモック */
const mockUserExists = () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "User") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: TARGET_USER_ID }, error: null }),
          }),
        }),
      };
    }
    return { select: vi.fn() };
  });
};

/** User テーブル参照を targetUser が存在しない状態でモック */
const mockUserNotFound = () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "User") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }
    return { select: vi.fn() };
  });
};

describe("ユーザーブロック作成 POST /api/social/blocks/:blockedUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("自分自身を指定した場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/social/blocks/${TEST_USER_ID}`, {
      method: "POST",
      headers,
    });

    // Assert
    expect(res.status).toBe(400);
    expect(mockCreateUserBlock).not.toHaveBeenCalled();
  });

  it("対象ユーザーが見つからない場合は404を返す", async () => {
    // Arrange
    mockUserNotFound();
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/social/blocks/${TARGET_USER_ID}`, {
      method: "POST",
      headers,
    });

    // Assert
    expect(res.status).toBe(404);
    expect(mockCreateUserBlock).not.toHaveBeenCalled();
  });

  it("既にブロック済みの場合は409を返す", async () => {
    // Arrange
    mockUserExists();
    mockCreateUserBlock.mockRejectedValue(new Error("ALREADY_BLOCKED"));
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/social/blocks/${TARGET_USER_ID}`, {
      method: "POST",
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
  });

  it("有効な入力でブロックが作成され201を返す", async () => {
    // Arrange
    mockUserExists();
    const mockBlock = {
      id: "block-1",
      blocker_user_id: TEST_USER_ID,
      blocked_user_id: TARGET_USER_ID,
      created_at: new Date().toISOString(),
    };
    mockCreateUserBlock.mockResolvedValue(mockBlock);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/social/blocks/${TARGET_USER_ID}`, {
      method: "POST",
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("block-1");
    expect(mockCreateUserBlock).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      TARGET_USER_ID,
    );
  });
});

describe("ユーザーブロック解除 DELETE /api/social/blocks/:blockedUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ブロック解除に成功した場合は200を返す", async () => {
    // Arrange
    mockDeleteUserBlock.mockResolvedValue(undefined);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/social/blocks/${TARGET_USER_ID}`, {
      method: "DELETE",
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteUserBlock).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      TARGET_USER_ID,
    );
  });

  it("解除処理でエラーが発生した場合は500を返す", async () => {
    // Arrange
    mockDeleteUserBlock.mockRejectedValue(new Error("DB error"));
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request(`/api/social/blocks/${TARGET_USER_ID}`, {
      method: "DELETE",
      headers,
    });

    // Assert
    expect(res.status).toBe(500);
  });
});

describe("ブロックリスト取得 GET /api/social/blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ブロックリストを取得して200を返す", async () => {
    // Arrange
    const mockList = [
      {
        id: "block-1",
        blocker_user_id: TEST_USER_ID,
        blocked_user_id: TARGET_USER_ID,
        created_at: new Date().toISOString(),
        blocked_user: {
          id: TARGET_USER_ID,
          username: "target",
          profile_image_url: null,
        },
      },
    ];
    mockGetUserBlocks.mockResolvedValue(mockList);
    const app = createTestApp();
    const headers = await createAuthHeaders();

    // Act
    const res = await app.request("/api/social/blocks", {
      method: "GET",
      headers,
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].blocked_user.username).toBe("target");
  });

  it("認証なしの場合は401を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/social/blocks", { method: "GET" });

    // Assert
    expect(res.status).toBe(401);
  });
});

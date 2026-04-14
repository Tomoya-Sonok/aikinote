import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import categoriesRoute from "./index.js";

// Supabase ライブラリのモック
const mockGetUserCategories = vi.fn();
const mockCreateUserCategory = vi.fn();
const mockUpdateUserCategory = vi.fn();
const mockDeleteUserCategory = vi.fn();

vi.mock("../../lib/supabase.js", () => ({
  getUserCategories: (...args: unknown[]) => mockGetUserCategories(...args),
  createUserCategory: (...args: unknown[]) => mockCreateUserCategory(...args),
  updateUserCategory: (...args: unknown[]) => mockUpdateUserCategory(...args),
  deleteUserCategory: (...args: unknown[]) => mockDeleteUserCategory(...args),
}));

const createTestApp = () => {
  const app = new Hono();
  app.route("/api/categories", categoriesRoute);
  return app;
};

describe("カテゴリ一覧取得 GET /api/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("user_id指定時にカテゴリ一覧と200を返す", async () => {
    // Arrange
    const mockCategories = [
      { id: "cat-1", name: "取り", user_id: "user-1", sort_order: 1 },
    ];
    mockGetUserCategories.mockResolvedValue(mockCategories);

    // Act
    const app = createTestApp();
    const res = await app.request("/api/categories?user_id=user-1");
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockCategories);
  });

  it("user_idが未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories");
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error).toBe("user_idパラメータは必須です");
  });

  it("DB取得でエラーが発生した場合は500を返す", async () => {
    // Arrange
    mockGetUserCategories.mockRejectedValue(new Error("DB接続エラー"));
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories?user_id=user-1");

    // Assert
    expect(res.status).toBe(500);
  });
});

describe("カテゴリ作成 POST /api/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("有効な入力でカテゴリが作成され201を返す", async () => {
    // Arrange
    const created = {
      id: "cat-new",
      name: "カスタム",
      user_id: "user-1",
      sort_order: 4,
    };
    mockCreateUserCategory.mockResolvedValue(created);
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "カスタム", user_id: "user-1" }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("カスタム");
  });

  it("カテゴリ名が11文字の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "あ".repeat(11), user_id: "user-1" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("カテゴリ名が空文字の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", user_id: "user-1" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("最大カテゴリ数に達している場合は400を返す", async () => {
    // Arrange: supabase層が「最大数に達しています」エラーをスロー
    mockCreateUserCategory.mockRejectedValue(new Error("最大数に達しています"));
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "テスト", user_id: "user-1" }),
    });
    const body = await res.json();

    // Assert: エラーメッセージに「最大」を含む場合は400
    expect(res.status).toBe(400);
    expect(body.error).toContain("最大");
  });

  it("同名カテゴリが既に存在する場合は400を返す", async () => {
    // Arrange
    mockCreateUserCategory.mockRejectedValue(
      new Error("既に存在するカテゴリ名です"),
    );
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "取り", user_id: "user-1" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });
});

describe("カテゴリ更新 PUT /api/categories/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("有効な入力でカテゴリ名が更新され200を返す", async () => {
    // Arrange
    const updated = {
      id: "cat-1",
      name: "新しい名前",
      user_id: "user-1",
      sort_order: 1,
    };
    mockUpdateUserCategory.mockResolvedValue(updated);
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories/cat-1?user_id=user-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新しい名前" }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("新しい名前");
  });

  it("user_idが未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "テスト" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("存在しないカテゴリの場合は400を返す", async () => {
    // Arrange
    mockUpdateUserCategory.mockRejectedValue(
      new Error("カテゴリが見つかりません"),
    );
    const app = createTestApp();

    // Act
    const res = await app.request(
      "/api/categories/nonexistent?user_id=user-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "テスト" }),
      },
    );

    // Assert
    expect(res.status).toBe(400);
  });
});

describe("カテゴリ削除 DELETE /api/categories/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常に削除され200を返す", async () => {
    // Arrange
    mockDeleteUserCategory.mockResolvedValue(undefined);
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories/cat-1?user_id=user-1", {
      method: "DELETE",
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteUserCategory).toHaveBeenCalledWith("cat-1", "user-1");
  });

  it("user_idが未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories/cat-1", {
      method: "DELETE",
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("DB削除でエラーが発生した場合は500を返す", async () => {
    // Arrange
    mockDeleteUserCategory.mockRejectedValue(new Error("DB接続エラー"));
    const app = createTestApp();

    // Act
    const res = await app.request("/api/categories/cat-1?user_id=user-1", {
      method: "DELETE",
    });

    // Assert
    expect(res.status).toBe(500);
  });
});

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import titleTemplatesRoute from "./index.js";

const mockGetTitleTemplates = vi.fn();
const mockCreateTitleTemplate = vi.fn();
const mockDeleteTitleTemplate = vi.fn();

vi.mock("../../lib/supabase.js", () => ({
  getTitleTemplates: (...args: unknown[]) => mockGetTitleTemplates(...args),
  createTitleTemplate: (...args: unknown[]) => mockCreateTitleTemplate(...args),
  deleteTitleTemplate: (...args: unknown[]) => mockDeleteTitleTemplate(...args),
}));

const createTestApp = () => {
  const app = new Hono();
  app.route("/api/title-templates", titleTemplatesRoute);
  return app;
};

describe("テンプレート一覧取得 GET /api/title-templates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("user_id指定時にテンプレート一覧と200を返す", async () => {
    // Arrange
    mockGetTitleTemplates.mockResolvedValue([
      { id: "t-1", template_text: "稽古メモ" },
    ]);
    const app = createTestApp();

    // Act
    const res = await app.request("/api/title-templates?user_id=user-1");
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("user_id未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/title-templates");

    // Assert
    expect(res.status).toBe(400);
  });
});

describe("テンプレート作成 POST /api/title-templates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("5件目までは201で作成成功する", async () => {
    // Arrange
    mockGetTitleTemplates.mockResolvedValue([{ id: "t-1" }]); // 既存1件
    mockCreateTitleTemplate.mockResolvedValue({
      id: "t-2",
      template_text: "新テンプレート",
    });
    const app = createTestApp();

    // Act
    const res = await app.request("/api/title-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "user-1",
        template_text: "新テンプレート",
      }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("5件に達している場合は400を返す", async () => {
    // Arrange: 既に5件存在
    mockGetTitleTemplates.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: `t-${i}` })),
    );
    const app = createTestApp();

    // Act
    const res = await app.request("/api/title-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "user-1",
        template_text: "6件目",
      }),
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error).toContain("5件");
  });

  it("template_textが36文字の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/title-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "user-1",
        template_text: "あ".repeat(36),
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });
});

describe("テンプレート削除 DELETE /api/title-templates/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常に削除されると200を返す", async () => {
    // Arrange
    mockDeleteTitleTemplate.mockResolvedValue({
      id: "t-1",
      template_text: "削除対象",
    });
    const app = createTestApp();

    // Act
    const res = await app.request("/api/title-templates/t-1?user_id=user-1", {
      method: "DELETE",
    });
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("存在しないテンプレートの場合は404を返す", async () => {
    // Arrange
    mockDeleteTitleTemplate.mockResolvedValue(null);
    const app = createTestApp();

    // Act
    const res = await app.request(
      "/api/title-templates/nonexistent?user_id=user-1",
      { method: "DELETE" },
    );

    // Assert
    expect(res.status).toBe(404);
  });

  it("user_id未指定の場合は400を返す", async () => {
    // Arrange
    const app = createTestApp();

    // Act
    const res = await app.request("/api/title-templates/t-1", {
      method: "DELETE",
    });

    // Assert
    expect(res.status).toBe(400);
  });
});

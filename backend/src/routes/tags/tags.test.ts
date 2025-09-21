import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseModule from "../../lib/supabase.js";
import tagsRoute from "./index.js";

describe("タグ一覧取得API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", tagsRoute);
    vi.clearAllMocks();
  });

  it("正常なリクエストでタグ一覧が取得されること", async () => {
    const mockTags = [
      {
        id: "test-tag-id-1",
        name: "立技",
        category: "取り",
        user_id: "test-user-id",
        created_at: "2023-01-01T00:00:00.000Z",
      },
      {
        id: "test-tag-id-2",
        name: "正面打ち",
        category: "受け",
        user_id: "test-user-id",
        created_at: "2023-01-01T00:00:00.000Z",
      },
      {
        id: "test-tag-id-3",
        name: "四方投げ",
        category: "技",
        user_id: "test-user-id",
        created_at: "2023-01-01T00:00:00.000Z",
      },
    ];

    vi.spyOn(supabaseModule, "getUserTags").mockResolvedValue(mockTags);

    const request = new Request("http://localhost/?user_id=test-user-id", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe("タグ一覧を取得しました");
    expect(responseBody.data).toHaveLength(3);
    expect(responseBody.data[0].name).toBe("立技");
    expect(responseBody.data[0].category).toBe("取り");
    expect(responseBody.data[1].name).toBe("正面打ち");
    expect(responseBody.data[1].category).toBe("受け");
    expect(responseBody.data[2].name).toBe("四方投げ");
    expect(responseBody.data[2].category).toBe("技");
  });

  it("user_idが未指定の場合にバリデーションエラーが返されること", async () => {
    const request = new Request("http://localhost/", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe("user_idパラメータは必須です");
  });

  it("データベースエラーが発生した場合にサーバーエラーが返されること", async () => {
    vi.spyOn(supabaseModule, "getUserTags").mockRejectedValue(
      new Error("データベース接続エラー"),
    );

    const request = new Request("http://localhost/?user_id=test-user-id", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain("データベース接続エラー");
  });

  it("タグが存在しない場合に空の配列が返されること", async () => {
    vi.spyOn(supabaseModule, "getUserTags").mockResolvedValue([]);

    const request = new Request("http://localhost/?user_id=test-user-id", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data).toHaveLength(0);
  });
});

describe("タグ作成API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", tagsRoute);
    vi.clearAllMocks();
  });

  it("正常なリクエストでタグが作成されること", async () => {
    const mockCreatedTag = {
      id: "test-tag-id",
      name: "四方投げ",
      category: "技",
      user_id: "test-user-id",
      created_at: "2023-01-01T00:00:00.000Z",
    };

    vi.spyOn(supabaseModule, "checkDuplicateTag").mockResolvedValue(null);
    vi.spyOn(supabaseModule, "createUserTag").mockResolvedValue(mockCreatedTag);

    const requestBody = {
      name: "四方投げ",
      category: "技",
      user_id: "test-user-id",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe("タグが正常に作成されました");
    expect(responseBody.data.name).toBe("四方投げ");
    expect(responseBody.data.category).toBe("技");
  });

  it("必須フィールドが不足している場合にバリデーションエラーが返されること", async () => {
    const requestBody = {
      category: "技",
      user_id: "test-user-id",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await app.fetch(request);

    expect(response.status).toBe(400);
  });

  it("タグ名が20文字を超える場合にバリデーションエラーが返されること", async () => {
    const longName = "あ".repeat(21);
    const requestBody = {
      name: longName,
      category: "技",
      user_id: "test-user-id",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await app.fetch(request);

    expect(response.status).toBe(400);
  });

  it("無効なカテゴリが指定された場合にバリデーションエラーが返されること", async () => {
    const requestBody = {
      name: "四方投げ",
      category: "無効なカテゴリ",
      user_id: "test-user-id",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await app.fetch(request);

    expect(response.status).toBe(400);
  });

  it("無効な文字が含まれる場合にバリデーションエラーが返されること", async () => {
    const requestBody = {
      name: "四方投げ@#$",
      category: "技",
      user_id: "test-user-id",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await app.fetch(request);

    expect(response.status).toBe(400);
  });

  it("同じ名前とカテゴリのタグが既に存在する場合にエラーが返されること", async () => {
    const existingTag = {
      id: "existing-tag-id",
      name: "四方投げ",
      category: "技",
      user_id: "test-user-id",
      created_at: "2023-01-01T00:00:00.000Z",
    };

    vi.spyOn(supabaseModule, "checkDuplicateTag").mockResolvedValue(
      existingTag,
    );

    const requestBody = {
      name: "四方投げ",
      category: "技",
      user_id: "test-user-id",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe("同じ名前とカテゴリのタグが既に存在します");
  });

  it("データベースエラーが発生した場合にサーバーエラーが返されること", async () => {
    vi.spyOn(supabaseModule, "checkDuplicateTag").mockResolvedValue(null);
    vi.spyOn(supabaseModule, "createUserTag").mockRejectedValue(
      new Error("タグ作成に失敗しました: データベース接続エラー"),
    );

    const requestBody = {
      name: "四方投げ",
      category: "技",
      user_id: "test-user-id",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain("タグ作成に失敗しました");
  });
});

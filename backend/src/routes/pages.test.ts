import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseModule from "../lib/supabase.js";
import pagesRoute from "./pages.js";

describe("ページ作成API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", pagesRoute);
    vi.clearAllMocks();
  });

  it("正常なリクエストでページが作成されること", async () => {
    const mockCreatedPage = {
      page: {
        id: "test-page-id",
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        comment: "姿勢に注意が必要",
        user_id: "test-user-id",
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      },
      tags: [
        {
          id: "test-tag-id-1",
          user_id: "test-user-id",
          name: "立技",
          category: "取り",
          created_at: "2023-01-01T00:00:00.000Z",
        },
        {
          id: "test-tag-id-2",
          user_id: "test-user-id",
          name: "正面打ち",
          category: "受け",
          created_at: "2023-01-01T00:00:00.000Z",
        },
        {
          id: "test-tag-id-3",
          user_id: "test-user-id",
          name: "四方投げ",
          category: "技",
          created_at: "2023-01-01T00:00:00.000Z",
        },
      ],
    };

    vi.spyOn(supabaseModule, "createTrainingPage").mockResolvedValue(
      mockCreatedPage,
    );

    const requestBody = {
      title: "テスト稽古ページ",
      content: "今日は基本動作の稽古を行いました",
      comment: "姿勢に注意が必要",
      user_id: "test-user-id",
      tori: ["立技"],
      uke: ["正面打ち"],
      waza: ["四方投げ"],
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
    expect(responseBody.message).toBe("ページが正常に作成されました");
    expect(responseBody.data).toEqual(mockCreatedPage);
  });

  it("必須フィールドが不足している場合にバリデーションエラーが返されること", async () => {
    const requestBody = {
      content: "今日は基本動作の稽古を行いました",
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

  it("タイトルが100文字を超える場合にバリデーションエラーが返されること", async () => {
    const longTitle = "あ".repeat(101);
    const requestBody = {
      title: longTitle,
      content: "今日は基本動作の稽古を行いました",
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

  it("稽古内容が2000文字を超える場合にバリデーションエラーが返されること", async () => {
    const longContent = "あ".repeat(2001);
    const requestBody = {
      title: "テスト稽古ページ",
      content: longContent,
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

  it("コメントが1000文字を超える場合にバリデーションエラーが返されること", async () => {
    const longComment = "あ".repeat(1001);
    const requestBody = {
      title: "テスト稽古ページ",
      content: "今日は基本動作の稽古を行いました",
      comment: longComment,
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

  it("データベースエラーが発生した場合にサーバーエラーが返されること", async () => {
    vi.spyOn(supabaseModule, "createTrainingPage").mockRejectedValue(
      new Error("データベース接続エラー"),
    );

    const requestBody = {
      title: "テスト稽古ページ",
      content: "今日は基本動作の稽古を行いました",
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
    expect(responseBody.error).toBe("データベース接続エラー");
  });
});

describe("ページ一覧取得API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", pagesRoute);
    vi.clearAllMocks();
  });

  it("正常なリクエストでページ一覧が取得されること", async () => {
    const mockPagesWithTags = [
      {
        page: {
          id: "test-page-id-1",
          title: "稽古ページ1",
          content: "基本動作の稽古",
          comment: "姿勢改善が必要",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [
          {
            id: "test-tag-id-1",
            name: "立技",
            category: "取り",
            user_id: "test-user-id",
            created_at: "2023-01-01T00:00:00.000Z",
          },
        ],
      },
      {
        page: {
          id: "test-page-id-2",
          title: "稽古ページ2",
          content: "応用技の稽古",
          comment: "タイミングに注意",
          user_id: "test-user-id",
          created_at: "2023-01-02T00:00:00.000Z",
          updated_at: "2023-01-02T00:00:00.000Z",
        },
        tags: [],
      },
    ];

    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue(
      mockPagesWithTags,
    );

    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=20",
      {
        method: "GET",
      },
    );

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe("ページ一覧を取得しました");
    expect(responseBody.data.training_pages).toHaveLength(2);
    expect(responseBody.data.training_pages[0].page.title).toBe("稽古ページ1");
    expect(responseBody.data.training_pages[0].tags).toHaveLength(1);
    expect(responseBody.data.training_pages[1].tags).toHaveLength(0);
  });

  it("user_idが未指定の場合にバリデーションエラーが返されること", async () => {
    const request = new Request("http://localhost/?limit=20", {
      method: "GET",
    });

    const response = await app.fetch(request);

    expect(response.status).toBe(400);
  });

  it("limitが1未満の場合にバリデーションエラーが返されること", async () => {
    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=0",
      {
        method: "GET",
      },
    );

    const response = await app.fetch(request);

    expect(response.status).toBe(400);
  });

  it("limitが100を超える場合にバリデーションエラーが返されること", async () => {
    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=101",
      {
        method: "GET",
      },
    );

    const response = await app.fetch(request);

    expect(response.status).toBe(400);
  });

  it("データベースエラーが発生した場合にサーバーエラーが返されること", async () => {
    vi.spyOn(supabaseModule, "getTrainingPages").mockRejectedValue(
      new Error("データベース接続エラー"),
    );

    const request = new Request("http://localhost/?user_id=test-user-id", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe("データベース接続エラー");
  });

  it("ページが存在しない場合に空の配列が返されること", async () => {
    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue([]);

    const request = new Request("http://localhost/?user_id=test-user-id", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.training_pages).toHaveLength(0);
  });
});

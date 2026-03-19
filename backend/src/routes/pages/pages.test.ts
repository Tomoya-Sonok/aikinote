import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseModule from "../../lib/supabase.js";
import pagesRoute from "./index.js";

describe("ページ作成API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", pagesRoute);
    vi.clearAllMocks();
  });

  it("有効なリクエストボディでページが作成され201を返す", async () => {
    // Arrange
    const mockCreatedPage = {
      page: {
        id: "test-page-id",
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        user_id: "test-user-id",
        is_public: false,
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
          sort_order: 1,
        },
        {
          id: "test-tag-id-2",
          user_id: "test-user-id",
          name: "正面打ち",
          category: "受け",
          created_at: "2023-01-01T00:00:00.000Z",
          sort_order: 2,
        },
        {
          id: "test-tag-id-3",
          user_id: "test-user-id",
          name: "四方投げ",
          category: "技",
          created_at: "2023-01-01T00:00:00.000Z",
          sort_order: 3,
        },
      ],
    };

    vi.spyOn(supabaseModule, "createTrainingPage").mockResolvedValue(
      mockCreatedPage,
    );

    const requestBody = {
      title: "テスト稽古ページ",
      content: "今日は基本動作の稽古を行いました",
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

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe("ページが正常に作成されました");
    expect(responseBody.data).toEqual(mockCreatedPage);
  });

  it("created_at指定時は指定値を利用してページを作成すること", async () => {
    // Arrange
    const mockCreatedPage = {
      page: {
        id: "test-page-id",
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        user_id: "test-user-id",
        is_public: false,
        created_at: "2026-03-13T00:00:00.000Z",
        updated_at: "2026-03-13T00:00:00.000Z",
      },
      tags: [],
    };
    const createTrainingPageSpy = vi
      .spyOn(supabaseModule, "createTrainingPage")
      .mockResolvedValue(mockCreatedPage);

    const requestBody = {
      title: "テスト稽古ページ",
      content: "今日は基本動作の稽古を行いました",
      user_id: "test-user-id",
      tori: [],
      uke: [],
      waza: [],
      created_at: "2026-03-13T00:00:00.000Z",
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(201);
    expect(createTrainingPageSpy).toHaveBeenCalledWith(
      {
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        user_id: "test-user-id",
        is_public: false,
        created_at: "2026-03-13T00:00:00.000Z",
      },
      {
        tori: [],
        uke: [],
        waza: [],
      },
    );
  });

  it("必須フィールドが不足している場合にバリデーションエラーが返されること", async () => {
    // Arrange
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

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("タイトルが100文字を超える場合にバリデーションエラーが返されること", async () => {
    // Arrange
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

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("稽古内容が3000文字を超える場合にバリデーションエラーが返されること", async () => {
    // Arrange
    const longContent = "あ".repeat(3001);
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

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("データベースエラーが発生した場合にサーバーエラーが返されること", async () => {
    // Arrange
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

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe("データベース接続エラー");
  });
});

describe("ページ詳細取得API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", pagesRoute);
    vi.clearAllMocks();
  });

  it("有効なページIDとuser_idでページ詳細と200を返す", async () => {
    // Arrange
    const mockPageWithTags = {
      page: {
        id: "test-page-id",
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        user_id: "test-user-id",
        is_public: false,
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
          sort_order: 1,
        },
        {
          id: "test-tag-id-2",
          user_id: "test-user-id",
          name: "正面打ち",
          category: "受け",
          created_at: "2023-01-01T00:00:00.000Z",
          sort_order: 2,
        },
      ],
    };

    vi.spyOn(supabaseModule, "getTrainingPageById").mockResolvedValue(
      mockPageWithTags,
    );

    const request = new Request(
      "http://localhost/test-page-id?user_id=test-user-id",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe("ページ詳細を取得しました");
    expect(responseBody.data.page.id).toBe("test-page-id");
    expect(responseBody.data.page.title).toBe("テスト稽古ページ");
    expect(responseBody.data.tags).toHaveLength(2);
  });

  it("user_idが未指定の場合にバリデーションエラーが返されること", async () => {
    // Arrange
    const request = new Request("http://localhost/test-page-id", {
      method: "GET",
    });

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("存在しないページIDを指定した場合にエラーが返されること", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "getTrainingPageById").mockRejectedValue(
      new Error("ページが見つからないか、アクセス権限がありません"),
    );

    const request = new Request(
      "http://localhost/non-existent-id?user_id=test-user-id",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe(
      "ページが見つからないか、アクセス権限がありません",
    );
  });

  it("他のユーザーのページにアクセスした場合にエラーが返されること", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "getTrainingPageById").mockRejectedValue(
      new Error("ページが見つからないか、アクセス権限がありません"),
    );

    const request = new Request(
      "http://localhost/test-page-id?user_id=other-user-id",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe(
      "ページが見つからないか、アクセス権限がありません",
    );
  });

  it("データベースエラーが発生した場合にサーバーエラーが返されること", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "getTrainingPageById").mockRejectedValue(
      new Error("データベース接続エラー"),
    );

    const request = new Request(
      "http://localhost/test-page-id?user_id=test-user-id",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe("データベース接続エラー");
  });

  it("タグが0件のページでもページ詳細と空タグ配列を返す", async () => {
    // Arrange
    const mockPageWithoutTags = {
      page: {
        id: "test-page-id",
        title: "タグなし稽古ページ",
        content: "タグを設定していない稽古の記録",
        user_id: "test-user-id",
        is_public: false,
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      },
      tags: [],
    };

    vi.spyOn(supabaseModule, "getTrainingPageById").mockResolvedValue(
      mockPageWithoutTags,
    );

    const request = new Request(
      "http://localhost/test-page-id?user_id=test-user-id",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.page.title).toBe("タグなし稽古ページ");
    expect(responseBody.data.tags).toHaveLength(0);
  });
});

type PageWithTags = {
  page: {
    id: string;
    title: string;
    content: string;
    user_id: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
  };
  tags: {
    id: string;
    user_id: string;
    name: string;
    category: string;
    created_at: string;
    sort_order: number | null;
  }[];
};

describe("ページ一覧取得API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", pagesRoute);
    vi.clearAllMocks();
  });

  it("user_idとlimit指定時にページ一覧と200を返す", async () => {
    // Arrange
    const mockPagesWithTags: PageWithTags[] = [
      {
        page: {
          id: "test-page-id-1",
          title: "稽古ページ1",
          content: "基本動作の稽古",
          user_id: "test-user-id",
          is_public: false,
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
            sort_order: 1,
          },
        ],
      },
      {
        page: {
          id: "test-page-id-2",
          title: "稽古ページ2",
          content: "応用技の稽古",
          user_id: "test-user-id",
          is_public: false,
          created_at: "2023-01-02T00:00:00.000Z",
          updated_at: "2023-01-02T00:00:00.000Z",
        },
        tags: [],
      },
    ];

    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue({
      pages: mockPagesWithTags,
      totalCount: mockPagesWithTags.length,
    });

    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=20",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe("ページ一覧を取得しました");
    expect(responseBody.data.training_pages).toHaveLength(2);
    expect(responseBody.data.training_pages[0].page.title).toBe("稽古ページ1");
    expect(responseBody.data.training_pages[0].tags).toHaveLength(1);
    expect(responseBody.data.training_pages[1].tags).toHaveLength(0);
  });

  it("user_idが未指定の場合にバリデーションエラーが返されること", async () => {
    // Arrange & Act
    const request = new Request("http://localhost/?limit=20", {
      method: "GET",
    });

    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("limitが1未満の場合にバリデーションエラーが返されること", async () => {
    // Arrange & Act
    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=0",
      {
        method: "GET",
      },
    );

    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("limitが100を超える場合にバリデーションエラーが返されること", async () => {
    // Arrange
    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=101",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("limit=100の場合にgetTrainingPagesがlimit:100で呼ばれる", async () => {
    // Arrange
    const mockPagesWithTags: PageWithTags[] = [
      {
        page: {
          id: "test-page-id",
          title: "稽古ページ",
          content: "基本動作の稽古",
          user_id: "test-user-id",
          is_public: false,
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [],
      },
    ];

    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue({
      pages: mockPagesWithTags,
      totalCount: 1,
    });

    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=100",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(supabaseModule.getTrainingPages).toHaveBeenCalledWith({
      userId: "test-user-id",
      limit: 100,
      offset: 0,
      query: undefined,
      tags: undefined,
      date: undefined,
      sortOrder: "newest",
    });
  });

  it("offset=40の場合にgetTrainingPagesがoffset:40で呼ばれる", async () => {
    // Arrange
    const mockPagesWithTags: PageWithTags[] = [];

    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue({
      pages: mockPagesWithTags,
      totalCount: 0,
    });

    const request = new Request(
      "http://localhost/?user_id=test-user-id&limit=20&offset=40",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(supabaseModule.getTrainingPages).toHaveBeenCalledWith({
      userId: "test-user-id",
      limit: 20,
      offset: 40,
      query: undefined,
      tags: undefined,
      date: undefined,
      sortOrder: "newest",
    });
  });

  it("query指定時にgetTrainingPagesにquery値が渡される", async () => {
    // Arrange
    const mockPagesWithTags: PageWithTags[] = [];

    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue({
      pages: mockPagesWithTags,
      totalCount: 0,
    });

    const request = new Request(
      "http://localhost/?user_id=test-user-id&query=基本動作",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(supabaseModule.getTrainingPages).toHaveBeenCalledWith({
      userId: "test-user-id",
      limit: 20,
      offset: 0,
      query: "基本動作",
      tags: undefined,
      date: undefined,
      sortOrder: "newest",
    });
  });

  it("tags指定時にgetTrainingPagesにtags値が渡される", async () => {
    // Arrange
    const mockPagesWithTags: PageWithTags[] = [];

    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue({
      pages: mockPagesWithTags,
      totalCount: 0,
    });

    const request = new Request(
      "http://localhost/?user_id=test-user-id&tags=立技,正面打ち",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(supabaseModule.getTrainingPages).toHaveBeenCalledWith({
      userId: "test-user-id",
      limit: 20,
      offset: 0,
      query: undefined,
      tags: "立技,正面打ち",
      date: undefined,
      sortOrder: "newest",
    });
  });

  it("date指定時にgetTrainingPagesにdate値が渡される", async () => {
    // Arrange
    const mockPagesWithTags: PageWithTags[] = [];

    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue({
      pages: mockPagesWithTags,
      totalCount: 0,
    });

    const request = new Request(
      "http://localhost/?user_id=test-user-id&date=2023-01-01",
      {
        method: "GET",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(supabaseModule.getTrainingPages).toHaveBeenCalledWith({
      userId: "test-user-id",
      limit: 20,
      offset: 0,
      query: undefined,
      tags: undefined,
      date: "2023-01-01",
      sortOrder: "newest",
    });
  });

  it("データベースエラーが発生した場合にサーバーエラーが返されること", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "getTrainingPages").mockRejectedValue(
      new Error("データベース接続エラー"),
    );

    const request = new Request("http://localhost/?user_id=test-user-id", {
      method: "GET",
    });

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe("データベース接続エラー");
  });

  it("ページが0件の場合に空配列と200を返す", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "getTrainingPages").mockResolvedValue({
      pages: [],
      totalCount: 0,
    });

    const request = new Request("http://localhost/?user_id=test-user-id", {
      method: "GET",
    });

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.training_pages).toHaveLength(0);
  });
});

describe("ページ削除API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", pagesRoute);
    vi.clearAllMocks();
  });

  it("有効なページIDとuser_idでページを削除し200を返す", async () => {
    // Arrange
    const deleteSpy = vi
      .spyOn(supabaseModule, "deleteTrainingPage")
      .mockResolvedValue();

    const request = new Request(
      "http://localhost/test-page-id?user_id=test-user-id",
      {
        method: "DELETE",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe("ページが正常に削除されました");
    expect(deleteSpy).toHaveBeenCalledWith("test-page-id", "test-user-id");
  });

  it("user_idが指定されていない場合にバリデーションエラーが返されること", async () => {
    // Arrange & Act
    const request = new Request("http://localhost/test-page-id", {
      method: "DELETE",
    });

    const response = await app.fetch(request);

    // Assert
    expect(response.status).toBe(400);
  });

  it("削除処理でエラーが発生した場合にサーバーエラーが返されること", async () => {
    // Arrange
    vi.spyOn(supabaseModule, "deleteTrainingPage").mockRejectedValue(
      new Error("削除に失敗しました"),
    );

    const request = new Request(
      "http://localhost/test-page-id?user_id=test-user-id",
      {
        method: "DELETE",
      },
    );

    // Act
    const response = await app.fetch(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe("削除に失敗しました");
  });
});

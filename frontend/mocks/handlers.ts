import { HttpResponse, http } from "msw";

// モックデータの定義（実際のセッションIDに合わせて修正）
const MOCK_USER = {
  id: "ec40977c-1de8-4784-ac78-e3ff3a5cb915", // 実際のセッションIDに修正
  username: "テストユーザー",
  email: "test@example.com",
  profile_image_url: null,
  dojo_id: "mock-dojo-456",
  training_start_date: "2023-01-01",
  publicity_setting: "private",
  language: "ja",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
};

const MOCK_DOJO = {
  id: "mock-dojo-456",
  name: "テスト道場",
  style: "西尾流合気道",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
};

// DefaultTagTemplateのモックデータ
const MOCK_DEFAULT_TAG_TEMPLATES = [
  {
    id: "default-1",
    category: "取り",
    name: "相半身",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-2",
    category: "取り",
    name: "逆半身",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-3",
    category: "取り",
    name: "正面",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-4",
    category: "受け",
    name: "片手取り",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-5",
    category: "受け",
    name: "諸手取り",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-6",
    category: "受け",
    name: "肩取り",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-7",
    category: "技",
    name: "四方投げ",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-8",
    category: "技",
    name: "入り身投げ",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "default-9",
    category: "技",
    name: "小手返し",
    created_at: "2023-01-01T00:00:00Z",
  },
];

// UserTagのモックデータ（初期状態は空の配列で、初期タグ作成をテストできるように）
const MOCK_USER_TAGS: Array<{
  id: string;
  user_id: string;
  category: string;
  name: string;
  created_at: string;
}> = [];

// Supabase認証のモックレスポンス
const MOCK_AUTH_USER = {
  id: MOCK_USER.id,
  aud: "authenticated",
  role: "authenticated",
  email: MOCK_USER.email,
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// APIエンドポイントのモックハンドラー
export const handlers = [
  // Supabase認証API - ログイン
  http.post("*/auth/v1/token", () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
      user: MOCK_AUTH_USER,
    });
  }),

  // Supabase認証API - ユーザー情報取得
  http.get("*/auth/v1/user", () => {
    return HttpResponse.json(MOCK_AUTH_USER);
  }),

  // Supabase認証API - サインアップ
  http.post("*/auth/v1/signup", () => {
    return HttpResponse.json({
      user: MOCK_AUTH_USER,
      session: {
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: MOCK_AUTH_USER,
      },
    });
  }),

  // Supabase認証API - サインアウト
  http.post("*/auth/v1/logout", () => {
    return HttpResponse.json({});
  }),

  // Supabase Data API - userテーブル取得（プロフィール情報）
  http.get("*/rest/v1/user", ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id === MOCK_USER.id) {
      return HttpResponse.json(MOCK_USER);
    }
    return HttpResponse.json([MOCK_USER]);
  }),

  // Supabase Data API - userテーブル挿入
  http.post("*/rest/v1/user", () => {
    return HttpResponse.json(MOCK_USER, { status: 201 });
  }),

  // Supabase Data API - Userテーブル（大文字）への挿入
  http.post("*/rest/v1/User", () => {
    return HttpResponse.json(MOCK_USER, { status: 201 });
  }),

  // Supabase Data API - Userテーブルから単一ユーザー取得
  http.get("*/rest/v1/User", ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id === MOCK_USER.id) {
      return HttpResponse.json(MOCK_USER);
    }
    return HttpResponse.json([MOCK_USER]);
  }),

  // ユーザー情報取得API
  http.get("/api/users", () => {
    return HttpResponse.json([MOCK_USER]);
  }),

  // 特定ユーザー情報取得API
  http.get("/api/users/:id", ({ params }) => {
    if (params.id === MOCK_USER.id) {
      return HttpResponse.json(MOCK_USER);
    }
    return HttpResponse.json({ error: "User not found" }, { status: 404 });
  }),

  // 道場一覧取得API
  http.get("/api/dojo", () => {
    return HttpResponse.json([MOCK_DOJO]);
  }),

  // 特定道場情報取得API
  http.get("/api/dojo/:id", ({ params }) => {
    if (params.id === MOCK_DOJO.id) {
      return HttpResponse.json(MOCK_DOJO);
    }
    return HttpResponse.json({ error: "Dojo not found" }, { status: 404 });
  }),

  // Supabase接続テストAPI
  http.get("/api/supabase-test", () => {
    return HttpResponse.json({
      success: true,
      message: "Mock Supabase connection successful",
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
    });
  }),

  // ユーザープロフィール更新API
  http.put("/api/users/:id", async ({ params, request }) => {
    if (params.id === MOCK_USER.id) {
      const body = (await request.json()) as Partial<typeof MOCK_USER>;
      const updatedUser = {
        ...MOCK_USER,
        ...body,
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json(updatedUser);
    }
    return HttpResponse.json({ error: "User not found" }, { status: 404 });
  }),

  // 新規ユーザー作成API
  http.post("/api/users", async ({ request }) => {
    const body = (await request.json()) as Partial<typeof MOCK_USER>;
    const newUser = {
      id: `mock-user-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    };
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // Next-Auth セッション API
  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      user: {
        id: MOCK_USER.id,
        name: MOCK_USER.username,
        email: MOCK_USER.email,
        image: MOCK_USER.profile_image_url,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間後
    });
  }),

  // Next-Auth CSRF token
  http.get("/api/auth/csrf", () => {
    return HttpResponse.json({
      csrfToken: "mock-csrf-token",
    });
  }),

  // Next-Auth providers
  http.get("/api/auth/providers", () => {
    return HttpResponse.json({
      credentials: {
        id: "credentials",
        name: "credentials",
        type: "credentials",
      },
      google: {
        id: "google",
        name: "Google",
        type: "oauth",
      },
    });
  }),

  // タグ一覧取得API
  http.get("/api/tags", ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return HttpResponse.json({ error: "user_idが必要です" }, { status: 400 });
    }

    if (userId === MOCK_USER.id) {
      return HttpResponse.json({ success: true, data: MOCK_USER_TAGS });
    }

    return HttpResponse.json({ success: true, data: [] });
  }),

  // タグ作成API
  http.post("/api/tags", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      category: string;
      user_id: string;
    };

    const { name, category, user_id } = body;

    if (!name || !category || !user_id) {
      return HttpResponse.json(
        { success: false, error: "必要なパラメータが不足しています" },
        { status: 400 },
      );
    }

    // ユーザーIDが存在するかチェック
    if (user_id !== MOCK_USER.id) {
      return HttpResponse.json(
        {
          success: false,
          error: "タグの作成に失敗しました",
        },
        { status: 500 },
      );
    }

    const newTag = {
      id: `user-tag-api-${Date.now()}`,
      user_id: user_id,
      category: category,
      name: name,
      created_at: new Date().toISOString(),
    };

    // MOCK_USER_TAGSに追加
    MOCK_USER_TAGS.push(newTag);

    return HttpResponse.json({ success: true, data: newTag });
  }),

  // 初期タグ作成API
  http.post("/api/initialize-user-tags", async ({ request }) => {
    const body = (await request.json()) as { user_id: string };
    if (body.user_id === MOCK_USER.id) {
      // DefaultTagTemplateからUserTagを作成
      const newUserTags = MOCK_DEFAULT_TAG_TEMPLATES.map((template, index) => ({
        id: `user-tag-${index + 1}`,
        user_id: MOCK_USER.id,
        category: template.category,
        name: template.name,
        created_at: new Date().toISOString(),
      }));

      // MOCK_USER_TAGSを更新
      MOCK_USER_TAGS.push(...newUserTags);

      return HttpResponse.json({
        success: true,
        data: newUserTags,
        message: "初期タグを作成しました",
      });
    }
    return HttpResponse.json(
      { success: false, error: "ユーザーが見つかりません" },
      { status: 404 },
    );
  }),

  // Supabase Data API - DefaultTagTemplate取得
  http.get("*/rest/v1/DefaultTagTemplate", () => {
    return HttpResponse.json(MOCK_DEFAULT_TAG_TEMPLATES);
  }),

  // Supabase Data API - UserTag取得
  http.get("*/rest/v1/UserTag", ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    if (userId === MOCK_USER.id) {
      return HttpResponse.json(MOCK_USER_TAGS);
    }
    return HttpResponse.json([]);
  }),

  // Supabase Data API - UserTag作成
  http.post("*/rest/v1/UserTag", async ({ request }) => {
    const body = await request.json();

    // 配列の場合は一括作成
    if (Array.isArray(body)) {
      const createdTags = body.map((tag, index) => {
        if (tag.user_id !== MOCK_USER.id) {
          throw new Error("Foreign key constraint violation");
        }
        return {
          id: `user-tag-bulk-${Date.now()}-${index}`,
          user_id: tag.user_id,
          category: tag.category,
          name: tag.name,
          created_at: new Date().toISOString(),
        };
      });

      MOCK_USER_TAGS.push(...createdTags);
      return HttpResponse.json(createdTags, { status: 201 });
    }

    // 単一オブジェクトの場合
    if (body.user_id !== MOCK_USER.id) {
      return HttpResponse.json(
        {
          message:
            'insert or update on table "UserTag" violates foreign key constraint "usertag_user_id_fkey"',
        },
        { status: 409 },
      );
    }

    const newTag = {
      id: `user-tag-new-${Date.now()}`,
      user_id: body.user_id,
      category: body.category,
      name: body.name,
      created_at: new Date().toISOString(),
    };

    MOCK_USER_TAGS.push(newTag);
    return HttpResponse.json(newTag, { status: 201 });
  }),

  // Supabase Data API - UserTagのカウント（ヘッドリクエスト）
  http.head("*/rest/v1/UserTag", ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const userTags = userId === MOCK_USER.id ? MOCK_USER_TAGS : [];
    const count = userTags.length;
    const response = new HttpResponse(null, {
      headers: {
        "Content-Range": count > 0 ? `0-${count - 1}/${count}` : "0-0/0",
      },
    });
    return response;
  }),
];

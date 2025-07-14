import { http, HttpResponse } from "msw";

// モックデータの定義
const MOCK_USER = {
	id: "mock-user-123",
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
	http.get("*/rest/v1/user", () => {
		return HttpResponse.json([MOCK_USER]);
	}),

	// Supabase Data API - userテーブル挿入
	http.post("*/rest/v1/user", () => {
		return HttpResponse.json(MOCK_USER, { status: 201 });
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
];

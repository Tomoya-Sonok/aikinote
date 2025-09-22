// 基本的なレスポンス型を定義
type ApiResponse = Record<string, unknown>;

// 道場の型定義
type Dojo = {
  id: string;
  name: string;
  style: string;
  created_at: string;
  updated_at: string;
};

// ユーザーの型定義
type User = {
  id: string;
  username: string;
  email: string;
  profile_image_url: string | null;
  training_start_date: string | null;
  publicity_setting: string;
  language: string;
  created_at: string;
  updated_at: string;
};

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
};

// APIリクエストのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

/**
 * APIリクエストを実行する汎用関数
 */
export async function fetchApi<T = ApiResponse>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<{ data: T | null; error: Error | null }> {
  const { method = "GET", headers = {}, body } = options;

  try {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      credentials: "include", // Cookieを含める
    };

    // リクエストボディがある場合は追加
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // レスポンスのJSONを取得
    const data = await response.json();

    // エラーレスポンスの場合
    if (!response.ok) {
      return {
        data: null,
        error: new Error(
          data.error || `API request failed with status ${response.status}`,
        ),
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error occurred"),
    };
  }
}

/**
 * 道場一覧を取得
 */
export async function getDojos() {
  return fetchApi<Dojo[]>("/api/dojo");
}

/**
 * ユーザー情報を取得
 */
export async function getUsers() {
  return fetchApi<User[]>("/api/users");
}

/**
 * Supabase接続テスト
 */
export async function testSupabaseConnection() {
  return fetchApi<{
    success: boolean;
    message?: string;
    serverTime?: string;
    timestamp?: string;
  }>("/api/supabase-test");
}

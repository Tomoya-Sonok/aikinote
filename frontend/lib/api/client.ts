const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL が設定されていません。バックエンドAPIのベースURLを環境変数に設定してください。",
  );
}

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// バックエンドAPIを呼び出すためのヘルパー関数
const apiCall = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    let errorMessage = "バックエンドAPIの呼び出しに失敗しました";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (_error) {
      // 404 HTMLなどJSONでないレスポンスが返る可能性があるため黙っておく
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

// ページ作成の型定義（フロントエンド用）
export interface CreatePagePayload {
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
  user_id: string;
}

// ページ作成API関数
export const createPage = async (pageData: CreatePagePayload) => {
  return apiCall("/api/pages", {
    method: "POST",
    body: JSON.stringify(pageData),
  });
};

// ページ一覧取得の引数の型
export interface GetPagesParams {
  userId: string;
  limit?: number;
  offset?: number;
  query?: string;
  tags?: string[];
  date?: string;
}

// ページ一覧取得API関数
export const getPages = async ({
  userId,
  limit,
  offset,
  query,
  tags,
  date,
}: GetPagesParams) => {
  const queryParams = new URLSearchParams({ user_id: userId });
  if (limit) queryParams.append("limit", limit.toString());
  if (offset) queryParams.append("offset", offset.toString());
  if (query) queryParams.append("query", query);
  if (tags && tags.length > 0) queryParams.append("tags", tags.join(","));
  if (date) queryParams.append("date", date);

  return apiCall(`/api/pages?${queryParams.toString()}`);
};

// ページ詳細取得API関数
export const getPage = async (pageId: string, userId: string) => {
  const queryParams = new URLSearchParams({ user_id: userId });
  return apiCall(`/api/pages/${pageId}?${queryParams.toString()}`);
};

// タグ関連のAPI関数
export interface CreateTagPayload {
  name: string;
  category: "取り" | "受け" | "技";
  user_id: string;
}

// タグ一覧取得API関数
export const getTags = async (userId: string) => {
  return apiCall(
    `/api/tags?${new URLSearchParams({ user_id: userId }).toString()}`,
  );
};

// タグ作成API関数
export const createTag = async (tagData: CreateTagPayload) => {
  return apiCall("/api/tags", {
    method: "POST",
    body: JSON.stringify(tagData),
  });
};

// ページ更新の型定義（フロントエンド用）
export interface UpdatePagePayload {
  id: string;
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
  user_id: string;
}

// ページ更新API関数
export const updatePage = async (pageData: UpdatePagePayload) => {
  return apiCall(`/api/pages/${pageData.id}`, {
    method: "PUT",
    body: JSON.stringify(pageData),
  });
};

// 初期タグ作成API関数（ローカル環境用）
export const initializeUserTags = async (userId: string) => {
  const response = await fetch("/api/initialize-user-tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "初期タグの作成に失敗しました");
  }

  return await response.json();
};

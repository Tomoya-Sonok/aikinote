import { hc } from "hono/client";

// 型定義（Hono RPC API routes）
type ApiRoute = {
  "/api/pages": {
    $post: {
      input: {
        json: {
          title: string;
          tori: string[];
          uke: string[];
          waza: string[];
          content: string;
          comment: string;
          user_id: string;
        };
      };
      output: {
        success: boolean;
        data?: {
          page: {
            id: string;
            title: string;
            content: string;
            comment: string;
            user_id: string;
            created_at: string;
            updated_at: string;
          };
          tags: Array<{
            id: string;
            name: string;
            category: string;
          }>;
        };
        error?: string;
        message?: string;
      };
    };
    $get: {
      input: {
        query: {
          user_id: string;
        };
      };
      output: {
        success: boolean;
        data?: Array<{
          page: {
            id: string;
            title: string;
            content: string;
            comment: string;
            user_id: string;
            created_at: string;
            updated_at: string;
          };
          tags: Array<{
            id: string;
            name: string;
            category: string;
          }>;
        }>;
        error?: string;
        message?: string;
      };
    };
  };
  "/api/tags": {
    $get: {
      input: {
        query: {
          user_id: string;
        };
      };
      output: {
        success: boolean;
        data?: Array<{
          id: string;
          name: string;
          category: string;
          user_id: string;
          created_at: string;
        }>;
        error?: string;
        message?: string;
      };
    };
    $post: {
      input: {
        json: {
          name: string;
          category: "取り" | "受け" | "技";
          user_id: string;
        };
      };
      output: {
        success: boolean;
        data?: {
          id: string;
          name: string;
          category: string;
          user_id: string;
          created_at: string;
        };
        error?: string;
        message?: string;
      };
    };
  };
};

// Hono RPC クライアントの作成
export const apiClient = hc<ApiRoute>(
  process.env.NODE_ENV === "production"
    ? "https://your-production-api.com" // TODO: 本番のAPIエンドポイントに変更
    : "http://localhost:8787",
);

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
  const response = await apiClient.api.pages.$post({
    json: pageData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "ページの作成に失敗しました");
  }

  return await response.json();
};

// ページ一覧取得API関数
export const getPages = async (userId: string) => {
  const response = await apiClient.api.pages.$get({
    query: { user_id: userId },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "ページ一覧の取得に失敗しました");
  }

  return await response.json();
};

// タグ関連のAPI関数
export interface CreateTagPayload {
  name: string;
  category: "取り" | "受け" | "技";
  user_id: string;
}

// タグ一覧取得API関数
export const getTags = async (userId: string) => {
  const response = await apiClient.api.tags.$get({
    query: { user_id: userId },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "タグ一覧の取得に失敗しました");
  }

  return await response.json();
};

// タグ作成API関数
export const createTag = async (tagData: CreateTagPayload) => {
  const response = await apiClient.api.tags.$post({
    json: tagData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "タグの作成に失敗しました");
  }

  return await response.json();
};

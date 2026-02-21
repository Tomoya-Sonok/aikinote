import type { UserSession } from "@/lib/auth";
import type { ApiResponse } from "@/lib/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

/**
 * ユーザープロフィール取得の共通関数
 * クライアントサイド・サーバーサイド両方で使用可能
 */
export async function fetchUserProfile(
  userId: string,
  options?: {
    baseUrl?: string;
    timeout?: number;
  },
): Promise<UserSession | null> {
  const { baseUrl = "", timeout = 5000 } = options || {};

  try {
    // タイムアウト付きでfetch実行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const apiUrl = `${baseUrl}/api/user/${userId}`;

    const response = await fetch(apiUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("fetchUserProfile: APIレスポンスエラー", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const result: ApiResponse<UserSession> = await response.json();

    if (result.success && result.data) {
      // データの型チェック
      const userData = result.data;

      if (userData.id && userData.email && userData.username) {
        return {
          id: userData.id,
          email: userData.email,
          username: userData.username,
          profile_image_url: userData.profile_image_url || null,
          dojo_style_name: userData.dojo_style_name || null,
        };
      } else {
        console.error(
          "fetchUserProfile: 不正なユーザーデータ形式",
          userData,
        );
        return null;
      }
    } else {
      const errorMessage = result.success
        ? "ユーザーデータが見つかりません"
        : result.error;
      console.error(
        "fetchUserProfile: API経由でユーザー取得失敗:",
        errorMessage,
      );
      return null;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("fetchUserProfile: タイムアウトエラー", {
        userId,
        timeout,
      });
    } else {
      console.error(
        "fetchUserProfile: API呼び出し中にエラー:",
        error,
      );
    }
    return null;
  }
}

/**
 * ユーザー作成のための共通関数
 */
export async function createUserProfile(userData: {
  email: string;
  password: string;
  username: string;
}): Promise<{
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}> {
  const getApiErrorMessage = (result: ApiResponse | null): string | null => {
    if (!result) {
      return null;
    }
    if ("error" in result && typeof result.error === "string") {
      return result.error;
    }
    return null;
  };

  try {
    const response = await fetch(buildApiUrl("/api/users"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        username: userData.username,
      }),
    });

    let result: ApiResponse | null = null;
    let parseErrorMessage: string | null = null;
    try {
      result = await response.json();
    } catch (error) {
      console.error("createUserProfile: JSON解析エラー", {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      parseErrorMessage =
        error instanceof Error ? error.message : "Invalid JSON response";
    }

    if (!response.ok || !result?.success) {
      const apiErrorMessage = getApiErrorMessage(result);
      const fallbackErrorMessage = response.ok
        ? "ユーザー作成に失敗しました"
        : `ユーザー作成に失敗しました (status: ${response.status})`;
      return {
        success: false,
        error: parseErrorMessage ?? apiErrorMessage ?? fallbackErrorMessage,
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}

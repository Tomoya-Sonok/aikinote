import type { UserSession } from "@/lib/auth";
import type { ApiResponse } from "@/lib/types/api";

/**
 * ユーザープロフィール取得の共通関数
 * クライアントサイド・サーバーサイド両方で使用可能
 */
export async function fetchUserProfile(
  userId: string,
  options?: {
    baseUrl?: string;
    timeout?: number;
  }
): Promise<UserSession | null> {
  const { baseUrl = "", timeout = 5000 } = options || {};

  try {
    console.log("fetchUserProfile: API経由でユーザー取得開始", { userId });

    // タイムアウト付きでfetch実行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}/api/user/${userId}`, {
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
    console.log("fetchUserProfile: API経由でユーザー取得結果", {
      success: result.success,
      hasData: result.success ? !!result.data : false,
    });

    if (result.success && result.data) {
      // データの型チェック
      const userData = result.data;
      if (userData.id && userData.email && userData.username) {
        return {
          id: userData.id,
          email: userData.email,
          username: userData.username,
          profile_image_url: userData.profile_image_url || null,
        };
      } else {
        console.error("fetchUserProfile: 不正なユーザーデータ形式", userData);
        return null;
      }
    } else {
      console.error("fetchUserProfile: API経由でユーザー取得失敗:", result.error);
      return null;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("fetchUserProfile: タイムアウトエラー", { userId, timeout });
    } else {
      console.error("fetchUserProfile: API呼び出し中にエラー:", error);
    }
    return null;
  }
}

/**
 * ユーザー作成のための共通関数
 */
export async function createUserProfile(userData: {
  id: string;
  email: string;
  username: string;
  dojo_id?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log("createUserProfile: ユーザー作成開始", {
      id: userData.id,
      email: userData.email,
      username: userData.username,
    });

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const result: ApiResponse = await response.json();

    if (!response.ok || !result.success) {
      console.error("createUserProfile: ユーザー作成失敗", {
        status: response.status,
        error: result.success ? undefined : result.error,
      });
      return {
        success: false,
        error: result.success ? "ユーザー作成に失敗しました" : result.error
      };
    }

    console.log("createUserProfile: ユーザー作成成功", result);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("createUserProfile: API呼び出し中にエラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知のエラーが発生しました",
    };
  }
}
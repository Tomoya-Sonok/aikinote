import { createUserViaTrpc, getUserInfo } from "@/lib/api/client";
import type { UserSession } from "@/lib/auth";

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
  // 互換のため引数は維持するが、通信はtRPCに統一する
  void options;

  try {
    const result = await getUserInfo(userId);
    if (!result.success || !result.data) {
      return null;
    }

    const userData = result.data;
    if (!userData.id || !userData.email || !userData.username) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      profile_image_url: userData.profile_image_url || null,
      dojo_style_name: userData.dojo_style_name || null,
      aikido_rank: userData.aikido_rank || null,
      full_name: userData.full_name || null,
    };
  } catch (error) {
    console.error(
      "📡 [DEBUG] fetchUserProfile: tRPC呼び出し中にエラー:",
      error,
    );
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
  language?: "ja" | "en";
}): Promise<{
  success: boolean;
  data?: {
    id: string;
    email: string;
    username: string;
  };
  message?: string;
  error?: string;
}> {
  try {
    const result = await createUserViaTrpc({
      email: userData.email,
      password: userData.password,
      username: userData.username,
      language: userData.language,
    });

    if (!result.success) {
      return {
        success: false,
        error:
          ("error" in result && result.error) || "ユーザー作成に失敗しました",
      };
    }

    return {
      success: true,
      data: result.data as {
        id: string;
        email: string;
        username: string;
      },
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

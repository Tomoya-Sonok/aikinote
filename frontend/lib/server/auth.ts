import type { UserSession } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { getApiBaseUrl } from "@/lib/utils/env";
import { fetchUserProfile } from "@/lib/utils/user-api";

export async function getCurrentUser(): Promise<UserSession | null> {
  console.log("🐾 getCurrentUser: start");
  const supabase = getServerSupabase();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    console.log("🐾 getCurrentUser: getSession done", {
      hasSession: !!session,
      userId: session?.user?.id,
      error: error?.message,
    });

    // デバッグ用ログ
    if (process.env.NODE_ENV === "development") {
      console.log("getCurrentUser session check:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: error?.message,
      });
    }

    if (error) {
      console.error("Session error in getCurrentUser:", error);
      return null;
    }

    if (!session?.user) {
      console.log("No session or user found in getCurrentUser");
      return null;
    }

    // 共通のプロフィール取得関数を使用
    try {
      const baseUrl = getApiBaseUrl();
      console.log("🐾 getCurrentUser: call fetchUserProfile", {
        userId: session.user.id,
        baseUrl,
      });
      const userProfile = await fetchUserProfile(session.user.id, { baseUrl });
      console.log("🐾 getCurrentUser: fetchUserProfile result", {
        hasProfile: !!userProfile,
      });

      if (!userProfile) {
        console.error("Profile fetch failed in getCurrentUser");
        return null;
      }

      // デバッグ用ログ
      if (process.env.NODE_ENV === "development") {
        console.log("getCurrentUser success:", {
          userId: session.user.id,
          username: userProfile.username,
        });
      }

      return userProfile;
    } catch (apiError) {
      console.error("API call failed in getCurrentUser:", apiError);
      // API呼び出しに失敗した場合はnullを返す（認証失敗として扱う）
      return null;
    }
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error);
    return null;
  }
}

export async function getUserProfile(userId: string) {
  try {
    const baseUrl = getApiBaseUrl();
    const userProfile = await fetchUserProfile(userId, { baseUrl });

    if (userProfile) {
      return { data: userProfile, error: null };
    } else {
      return { data: null, error: { message: "User not found" } };
    }
  } catch (error) {
    console.error("getUserProfile API call failed:", error);
    return { data: null, error: { message: "API call failed" } };
  }
}

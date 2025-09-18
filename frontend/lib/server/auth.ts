import type { UserSession } from "@/lib/auth";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = getServerSupabase();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

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

    // Userテーブルからプロフィール情報を取得（Service Roleキーを使用してRLSをバイパス）
    const serviceSupabase = getServiceRoleSupabase();
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from("User")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error in getCurrentUser:", profileError);
      return null;
    }

    if (!userProfile) {
      console.error("No user profile found for user:", session.user.id);
      return null;
    }

    // デバッグ用ログ
    if (process.env.NODE_ENV === "development") {
      console.log("getCurrentUser success:", {
        userId: session.user.id,
        username: userProfile.username,
      });
    }

    return {
      id: session.user.id,
      email: userProfile.email,
      username: userProfile.username,
      profile_image_url: userProfile.profile_image_url,
    };
  } catch (error) {
    console.error("Unexpected error in getCurrentUser:", error);
    return null;
  }
}

export async function getUserProfile(userId: string) {
  const serviceSupabase = getServiceRoleSupabase();

  const { data, error } = await serviceSupabase
    .from("User")
    .select("*")
    .eq("id", userId)
    .single();

  return { data, error };
}

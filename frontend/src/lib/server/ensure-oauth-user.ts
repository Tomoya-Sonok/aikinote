import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

const MAX_OAUTH_AVATAR_BYTES = 1 * 1024 * 1024; // 1MB

type SupabaseIdentity = {
  provider?: string | null;
  identity_data?: Record<string, unknown> | null;
};

type OAuthUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown> | null;
  identities?: SupabaseIdentity[] | null;
};

const getStringFromRecord = (
  record: Record<string, unknown> | null | undefined,
  key: string,
): string | null => {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
};

export async function pickOAuthAvatarUrl(
  user: OAuthUser | null | undefined,
): Promise<string | null> {
  if (!user) return null;

  // Apple プロバイダーは通常プロフィール画像を提供しない
  const isAppleOnly =
    user.identities?.every((i) => i.provider === "apple") ?? false;
  if (isAppleOnly && !user.user_metadata?.avatar_url) return null;

  const fromMetadata =
    getStringFromRecord(user.user_metadata, "avatar_url") ??
    getStringFromRecord(user.user_metadata, "picture") ??
    null;

  // Google / その他プロバイダーの identity_data からアバターを探す
  const oauthIdentity = user.identities?.find(
    (identity) =>
      identity.provider !== "apple" && identity.identity_data?.avatar_url,
  );

  const fromIdentity =
    getStringFromRecord(oauthIdentity?.identity_data, "avatar_url") ??
    getStringFromRecord(oauthIdentity?.identity_data, "picture") ??
    null;

  const candidate = fromMetadata ?? fromIdentity;

  if (!candidate) {
    return null;
  }

  try {
    const headResponse = await fetch(candidate, { method: "HEAD" });

    if (!headResponse.ok) {
      return null;
    }

    const contentLength = headResponse.headers.get("content-length");
    if (!contentLength) {
      return null;
    }

    const size = Number(contentLength);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_OAUTH_AVATAR_BYTES) {
      return null;
    }

    return candidate;
  } catch (error) {
    console.error("OAuth avatar size check failed", error);
    return null;
  }
}

/**
 * OAuth ユーザーが DB に存在しない場合、新規作成する。
 * 既存ユーザーの場合は何もしない。
 */
export async function ensureOAuthUser(
  user: OAuthUser,
  locale: string,
): Promise<void> {
  try {
    const serviceSupabase = getServiceRoleSupabase();

    const { data: existingUser, error: selectError } = await serviceSupabase
      .from("User")
      .select("id, email, username")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      console.error("ユーザー存在チェックエラー:", selectError);
      return;
    }

    if (existingUser) {
      return;
    }

    // ユーザーが存在しない場合、新規作成
    const username = user.email.split("@")[0];
    const profileImageUrl = await pickOAuthAvatarUrl(user);
    const { error: insertError } = await serviceSupabase
      .from("User")
      .insert({
        id: user.id,
        email: user.email,
        username: username,
        profile_image_url: profileImageUrl,
        training_start_date: null,
        publicity_setting: "public",
        language: locale,
        is_email_verified: true,
        verification_token: null,
        password_hash: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, email, username")
      .single();

    if (insertError) {
      console.error("ユーザー作成エラー:", insertError);
      return;
    }

    await initializeUserTagsIfNeeded(user.id);
  } catch (error) {
    console.error("ユーザー作成処理でエラー:", error);
  }
}

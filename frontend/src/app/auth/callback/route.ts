import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

const buildLocalizedUrl = (
  origin: string,
  locale: string,
  pathWithLeadingSlash: string,
) => {
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return new URL(`${localePrefix}${pathWithLeadingSlash}`, origin);
};

const MAX_OAUTH_AVATAR_BYTES = 1 * 1024 * 1024; // 1MB

const normalizeOrigin = (url: URL) => {
  if (url.hostname === "0.0.0.0") {
    const portSegment = url.port ? `:${url.port}` : "";
    return `${url.protocol}//localhost${portSegment}`;
  }

  return url.origin;
};

type SupabaseIdentity = {
  provider?: string | null;
  identity_data?: Record<string, unknown> | null;
};

type SupabaseUserForAvatar = {
  user_metadata?: Record<string, unknown> | null;
  identities?: SupabaseIdentity[] | null;
};

const getStringFromRecord = (
  record: Record<string, unknown> | null | undefined,
  key: string,
) => {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
};

async function pickGoogleAvatarUrl(
  user: SupabaseUserForAvatar | null | undefined,
): Promise<string | null> {
  if (!user) return null;

  const fromMetadata =
    getStringFromRecord(user.user_metadata, "avatar_url") ??
    getStringFromRecord(user.user_metadata, "picture") ??
    null;

  const googleIdentity = user.identities?.find(
    (identity) => identity.provider === "google",
  );

  const fromIdentity =
    getStringFromRecord(googleIdentity?.identity_data, "avatar_url") ??
    getStringFromRecord(googleIdentity?.identity_data, "picture") ??
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
    console.error("OAuth callback: avatar size check failed", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectOrigin = normalizeOrigin(requestUrl);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    // デバッグログ: クッキーの確認
    const cookieNames = cookieStore.getAll().map((c) => c.name);
    const verifierCookie = cookieNames.find((n) => n.includes("code-verifier"));
    console.log("[Auth Callback] Request URL:", requestUrl.toString());
    console.log("[Auth Callback] Cookies present:", cookieNames);
    console.log(
      "[Auth Callback] Verifier cookie found:",
      verifierCookie || "None",
    );

    const localeFromCookie = cookieStore.get("NEXT_LOCALE")?.value;
    const locale = localeFromCookie ?? routing.defaultLocale;
    const buildUrl = (pathWithLeadingSlash: string) =>
      buildLocalizedUrl(redirectOrigin, locale, pathWithLeadingSlash);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("[Auth Callback] Supabase Config:", {
      url: supabaseUrl ? "Present" : "Missing",
      key: supabaseAnonKey ? "Present" : "Missing",
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables are not configured");
      return NextResponse.redirect(buildUrl("/login?error=configuration"));
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        },
      },
    });

    try {
      // 認証コードをセッションに交換
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("認証コード交換エラー:", error);
        return NextResponse.redirect(buildUrl("/login?error=auth_error"));
      }
      // 新規ユーザーの場合、データベースにユーザー情報を作成
      if (data?.user?.email) {
        try {
          const serviceSupabase = getServiceRoleSupabase();

          // ユーザーが既に存在するかチェック（直接データベースアクセス）
          const { data: existingUser, error: selectError } =
            await serviceSupabase
              .from("User")
              .select("id, email, username")
              .eq("id", data.user.id)
              .maybeSingle();

          if (selectError) {
            console.error("ユーザー存在チェックエラー:", selectError);
            // エラーがあってもリダイレクトは続行
          } else if (!existingUser) {
            // ユーザーが存在しない場合、新規作成

            // usernameを生成 (emailのローカル部分を使用)
            const username = data.user.email.split("@")[0];
            const profileImageUrl = await pickGoogleAvatarUrl(data.user);
            const { error: insertError } = await serviceSupabase
              .from("User")
              .insert({
                id: data.user.id,
                email: data.user.email,
                username: username,
                profile_image_url: profileImageUrl,
                training_start_date: null,
                publicity_setting: "private",
                language: "ja",
                is_email_verified: true, // OAuth認証の場合は既にメール確認済み
                verification_token: null,
                password_hash: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select("id, email, username")
              .single();

            if (insertError) {
              console.error("ユーザー作成エラー:", insertError);
              // エラーがあってもリダイレクトは続行
            } else {
              // ユーザータグ初期化（エラーが発生してもリダイレクトは続行）
              await initializeUserTagsIfNeeded(data.user.id);
            }
          } else {
            console.log("ユーザーは既に存在します:", data.user.email);
          }
        } catch (userCreationError) {
          console.error("ユーザー作成処理でエラー:", userCreationError);
          // エラーがあってもリダイレクトは続行
        }
      }

      // 認証成功時は元のリダイレクト先にリダイレクト
      return NextResponse.redirect(buildUrl("/personal/pages"));
    } catch (error) {
      console.error("認証処理エラー:", error);
      return NextResponse.redirect(buildUrl("/login?error=auth_error"));
    }
  }

  // コードがない場合はログインページにリダイレクト
  const fallbackCookieStore = await cookies();
  const locale =
    fallbackCookieStore.get("NEXT_LOCALE")?.value ?? routing.defaultLocale;
  const fallbackUrl = buildLocalizedUrl(redirectOrigin, locale, "/login");
  return NextResponse.redirect(fallbackUrl);
}

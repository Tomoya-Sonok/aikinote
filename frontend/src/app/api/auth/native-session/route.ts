import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { ensureOAuthUser } from "@/lib/server/ensure-oauth-user";

/**
 * POST /api/auth/native-session
 *
 * ネイティブアプリから受け取った OAuth トークンで Supabase セッションを確立し、
 * HTTPOnly Cookie をセットする。WebView の fetch で呼び出される想定。
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  let body: { access_token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "missing_tokens" }, { status: 400 });
  }

  // レスポンスに Cookie をセットするため、response を先に作成
  const response = NextResponse.json({ success: true });

  // ネイティブアプリ (WebView) で kill 後も認証を維持できるよう、Supabase SSR が
  // セットする Cookie に明示的な永続化属性を付与する。Supabase デフォルトでは
  // maxAge が省略されるケースがあり、その場合 WebView は session cookie として
  // 扱ってアプリ終了時に消去するため、1 日に数回再ログインが必要になる症状が出る。
  const PERSISTENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60日 (refresh token 寿命に合わせる)

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({
            name,
            value,
            ...options,
            maxAge: options.maxAge ?? PERSISTENT_COOKIE_MAX_AGE,
            sameSite: options.sameSite ?? "lax",
            httpOnly: options.httpOnly ?? true,
            path: options.path ?? "/",
          });
        });
      },
    },
  });

  // トークンからセッションを確立（Cookie がセットされる）
  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError) {
    console.error("ネイティブセッション確立エラー:", sessionError);
    return NextResponse.json({ error: "session_error" }, { status: 401 });
  }

  // ユーザー情報を取得し、DB にユーザーが存在しなければ作成
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    console.error("ユーザー取得エラー:", userError);
    // セッション自体は確立できているので success を返す
    return response;
  }

  const locale =
    request.cookies.get("NEXT_LOCALE")?.value ?? routing.defaultLocale;

  await ensureOAuthUser(
    {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      identities: user.identities,
    },
    locale,
  );

  return response;
}

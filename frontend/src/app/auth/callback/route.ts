import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { ensureOAuthUser } from "@/lib/server/ensure-oauth-user";
import { isValidReturnTo, RETURN_TO_COOKIE_NAME } from "@/lib/utils/returnTo";

const buildLocalizedUrl = (
  origin: string,
  locale: string,
  pathWithLeadingSlash: string,
) => {
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return new URL(`${localePrefix}${pathWithLeadingSlash}`, origin);
};

const normalizeOrigin = (url: URL) => {
  if (url.hostname === "0.0.0.0") {
    const portSegment = url.port ? `:${url.port}` : "";
    return `${url.protocol}//localhost${portSegment}`;
  }

  return url.origin;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectOrigin = normalizeOrigin(requestUrl);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    const localeFromCookie = cookieStore.get("NEXT_LOCALE")?.value;
    const locale = localeFromCookie ?? routing.defaultLocale;
    const buildUrl = (pathWithLeadingSlash: string) =>
      buildLocalizedUrl(redirectOrigin, locale, pathWithLeadingSlash);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables are not configured");
      return NextResponse.redirect(buildUrl("/login?error=configuration"));
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
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
        await ensureOAuthUser(
          {
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata,
            identities: data.user.identities,
          },
          locale,
        );
      }

      // 認証成功時のリダイレクト（returnTo cookie があれば元のページへ）
      const returnToCookie = cookieStore.get(RETURN_TO_COOKIE_NAME)?.value;
      const returnToPath = returnToCookie
        ? decodeURIComponent(returnToCookie)
        : null;

      let response: NextResponse;
      if (returnToPath && isValidReturnTo(returnToPath)) {
        response = NextResponse.redirect(new URL(returnToPath, redirectOrigin));
      } else {
        response = NextResponse.redirect(buildUrl("/personal/pages"));
      }

      // returnTo cookie をクリア
      response.cookies.set(RETURN_TO_COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
      });
      return response;
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

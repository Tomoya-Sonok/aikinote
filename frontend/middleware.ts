import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

// next-intl middleware を作成
const handleI18nRouting = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  if (process.env.SKIP_MIDDLEWARE === "true") {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
  if (process.env.NODE_ENV === "development") {
    console.log("[middleware] start", request.nextUrl.pathname);
  }
  // 認証コールバックパスはi18nルーティングを除外
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    // 認証関連のパスは直接処理
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Supabase認証処理のみ実行
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: "", ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      });

      // セッションを取得してCookieを同期
      try {
        await supabase.auth.getSession();
      } finally {
        if (process.env.NODE_ENV === "development") {
          console.log("[middleware] auth callback getSession done");
        }
      }
    }

    return response;
  }

  // 先に国際化ルーティングを処理
  const i18nResponse = handleI18nRouting(request);

  let response =
    i18nResponse ||
    NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

  // 環境変数の存在確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // リクエストにCookieを設定
        request.cookies.set({
          name,
          value,
          ...options,
        });
        // 新しいレスポンスを作成してCookieを設定
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        // リクエストからCookieを削除
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        // 新しいレスポンスを作成してCookieを削除
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  // セッションを取得してCookieを同期
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (process.env.NODE_ENV === "development") {
    console.log("[middleware] main getSession done");
  }

  // セッション情報をログ出力（デバッグ用）
  if (process.env.NODE_ENV === "development") {
    console.log(
      "Middleware session:",
      session ? session?.user?.identities?.[0]?.user_id : "No active session",
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * APIやNext.js内部パス、拡張子を含む静的ファイルはi18nルーティングを適用しない
     * （例: /icons/calendar-icon.svg や /images/logo.png をそのまま配信する）
     */
    "/((?!api|_next|.*\\..*).*)",
  ],
};

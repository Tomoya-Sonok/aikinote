import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

function createMiddlewareSupabase(
  request: NextRequest,
  setResponse: (res: NextResponse) => void,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        const res = NextResponse.next({
          request: { headers: request.headers },
        });
        res.cookies.set({ name, value, ...options });
        setResponse(res);
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        const res = NextResponse.next({
          request: { headers: request.headers },
        });
        res.cookies.set({ name, value: "", ...options });
        setResponse(res);
      },
    },
  });
}

export async function proxy(request: NextRequest) {
  // --- LINE内蔵ブラウザ対策 ---
  // LINE WebView から openExternalBrowser=1 なしでアクセスされた場合、
  // パラメータを付与してリダイレクトし、外部ブラウザで開かせる。
  // Google / Apple OAuth が WebView でブロックされる問題の回避策。
  // 注意: openExternalBrowser=1 は LINE 独自パラメータ。X / Instagram には効かない。
  const userAgent = request.headers.get("user-agent") || "";
  const isLineWebView = /\bLine\//i.test(userAgent);

  if (
    isLineWebView &&
    !request.nextUrl.searchParams.has("openExternalBrowser")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.set("openExternalBrowser", "1");
    return NextResponse.redirect(redirectUrl, 302);
  }
  // --- LINE内蔵ブラウザ対策 ここまで ---

  const shouldSkipAuthSync = process.env.SKIP_MIDDLEWARE === "true";

  if (request.nextUrl.pathname.startsWith("/auth/")) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    if (!shouldSkipAuthSync) {
      const supabase = createMiddlewareSupabase(request, (res) => {
        response = res;
      });
      if (supabase) {
        await supabase.auth.getSession();
      }
    }

    return response;
  }

  const i18nResponse =
    handleI18nRouting(request) ||
    NextResponse.next({
      request: { headers: request.headers },
    });

  if (shouldSkipAuthSync) {
    return i18nResponse;
  }

  let authResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createMiddlewareSupabase(request, (res) => {
    authResponse = res;
  });

  if (supabase) {
    await supabase.auth.getSession();

    for (const cookie of authResponse.cookies.getAll()) {
      i18nResponse.cookies.set(cookie);
    }
  }

  return i18nResponse;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

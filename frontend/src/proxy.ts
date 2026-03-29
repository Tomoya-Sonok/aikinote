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

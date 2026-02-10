// lib/supabase/server.ts  ← サーバーだけ

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getServiceRoleSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      cookies: {
        get() {
          return undefined;
        },
        set() {},
        remove() {},
      },
    },
  );
}

export async function getServerSupabase() {
  // SSG時のエラーを回避
  try {
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Cookie設定エラーを無視（読み取り専用コンテキストの場合）
              console.warn("Failed to set cookie:", name, error);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              // Cookie削除エラーを無視（読み取り専用コンテキストの場合）
              console.warn("Failed to remove cookie:", name, error);
            }
          },
        },
      },
    );
  } catch (_error) {
    // SSG時やcookiesが利用できない場合のフォールバック
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          get() {
            return undefined;
          },
          set() {},
          remove() {},
        },
      },
    );
  }
}

"use client";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase environment variables are missing!",
    "URL:",
    supabaseUrl,
    "Key:",
    supabaseAnonKey ? "[PRESENT]" : "[MISSING]",
  );
  throw new Error(
    "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

// GoTrueClient は複数インスタンスを立てると認証状態が不整合になりうるため、
// モジュールスコープで singleton を維持する。
// 型は createBrowserClient の呼び出し結果から具体型が推論されるよう、
// 一旦ローカル関数を経由して ReturnType を取る（generic 直参照だとジェネリクスが展開されず any 化する）
const buildBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing");
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

let cachedClient: ReturnType<typeof buildBrowserClient> | undefined;

export function getClientSupabase() {
  if (cachedClient) return cachedClient;
  try {
    cachedClient = buildBrowserClient();
    return cachedClient;
  } catch (error) {
    console.error("getClientSupabase: クライアント作成エラー", error);
    throw error;
  }
}

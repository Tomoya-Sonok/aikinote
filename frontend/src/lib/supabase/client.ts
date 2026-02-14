"use client";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// デバッグ用: ブラウザコンソールで環境変数の読み込み状況を確認
if (typeof window !== "undefined") {
  console.log("[Supabase] Client Environment Check:", {
    url: supabaseUrl ? `${supabaseUrl.slice(0, 10)}...` : "MISSING",
    hasKey: !!supabaseAnonKey,
    nodeEnv: process.env.NODE_ENV,
  });
}

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

export function getClientSupabase() {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are missing");
    }
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return client;
  } catch (error) {
    console.error("getClientSupabase: クライアント作成エラー", error);
    throw error;
  }
}

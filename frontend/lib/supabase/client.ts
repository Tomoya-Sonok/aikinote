// lib/supabase/client.ts  ← クライアントだけ
"use client";
import { createBrowserClient } from "@supabase/ssr";

// 環境変数の存在確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

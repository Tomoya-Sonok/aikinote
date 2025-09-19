"use client";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export function getClientSupabase() {
  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return client;
  } catch (error) {
    console.error("getClientSupabase: クライアント作成エラー", error);
    throw error;
  }
}

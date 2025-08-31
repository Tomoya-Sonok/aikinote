// lib/supabase/server.ts  ← サーバーだけ
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getServerSupabase() {
	// SSG時のエラーを回避
	try {
		const cookieStore = cookies();
		return createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL || "",
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
			{
				cookies: {
					get(name) {
						return cookieStore.get(name)?.value;
					},
					set(name, value, options) {
						cookieStore.set({ name, value, ...options });
					},
					remove(name, options) {
						cookieStore.set({ name, value: "", ...options });
					},
				},
			},
		);
	} catch (error) {
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

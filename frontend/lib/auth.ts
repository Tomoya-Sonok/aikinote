import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServerSupabase } from "@/lib/supabase/server";

export type SignUpCredentials = {
	email: string;
	password: string;
	username: string;
};

export type SignInCredentials = {
	email: string;
	password: string;
};

export type UserSession = {
	id: string;
	email: string;
	username: string;
	profile_image_url: string | null;
	dojo_style_name: string | null;
};

export async function signUp(credentials: SignUpCredentials) {
	const supabase = getServerSupabase();

	// Supabase Authでユーザーを作成
	const { data: authData, error: authError } = await supabase.auth.signUp({
		email: credentials.email,
		password: credentials.password,
		options: {
			data: {
				username: credentials.username,
			},
		},
	});

	if (authError) {
		return { data: null, error: authError };
	}

	// 認証が成功したら、ユーザーテーブルにも情報を追加
	if (authData?.user) {
		const { error: profileError } = await supabase.from("User").insert({
			id: authData.user.id,
			email: credentials.email,
			username: credentials.username,
			profile_image_url: null,
			training_start_date: null,
			publicity_setting: "private",
			language: "ja",
			is_email_verified: false,
			password_hash: "",
		});

		if (profileError) {
			const { error } = await supabase.auth.admin.deleteUser(authData.user.id);
			if (error) return { data: null, error };
			return { data: null, error: profileError };
		}

		try {
			await initializeUserTagsIfNeeded(authData.user.id);
		} catch (error) {
			console.error("初期タグ作成エラー:", error);
		}
	}

	return { data: authData, error: null };
}

export async function signIn({ email, password }: SignInCredentials) {
	const supabase = getServerSupabase();
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});
	return { data, error };
}

export async function signOut() {
	const supabase = getServerSupabase();
	const { error } = await supabase.auth.signOut();
	return { error };
}

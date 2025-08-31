import { getServerSupabase } from "@/lib/supabase/server";

export type SignUpCredentials = {
	email: string;
	password: string;
	username: string;
	dojoId?: string;
};

export type SignInCredentials = {
	email: string;
	password: string;
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
				dojo_id: credentials.dojoId || null,
			},
		},
	});

	if (authError) {
		return { data: null, error: authError };
	}

	// 認証が成功したら、ユーザーテーブルにも情報を追加
	if (authData?.user) {
		const { error: profileError } = await supabase.from("user").insert({
			id: authData.user.id,
			email: credentials.email,
			username: credentials.username,
			password_hash: "managed_by_supabase", // 実際のハッシュはSupabaseが管理
			dojo_id: credentials.dojoId || null,
			publicity_setting: "private",
		});

		if (profileError) {
			// プロフィール作成に失敗した場合は、作成したユーザーを削除
			const { error } = await supabase.auth.admin.deleteUser(authData.user.id);
			if (error) return { data: null, error };
			return { data: null, error: profileError };
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

export async function getCurrentUser() {
	const supabase = getServerSupabase();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return user;
}

export async function getUserProfile(userId: string) {
	const supabase = getServerSupabase();
	const { data, error } = await supabase
		.from("user")
		.select("*")
		.eq("id", userId)
		.single();

	return { data, error };
}

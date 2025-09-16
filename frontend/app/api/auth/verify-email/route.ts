import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { isTokenExpired } from "@/lib/utils/auth";

export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const token = searchParams.get("token");

		if (!token) {
			return NextResponse.json(
				{ error: "認証トークンが提供されていません" },
				{ status: 400 },
			);
		}

		const supabase = getServiceRoleSupabase();

		// トークンでユーザーを検索
		const { data: user, error: findError } = await supabase
			.from("User")
			.select("*")
			.eq("verification_token", token)
			.single();

		if (findError || !user) {
			return NextResponse.json(
				{ error: "無効な認証トークンです" },
				{ status: 400 },
			);
		}

		// 既に認証済みかチェック
		if (user.is_email_verified) {
			return NextResponse.json(
				{ message: "このアカウントは既に認証済みです" },
				{ status: 200 },
			);
		}

		// トークンの有効期限をチェック
		if (isTokenExpired(new Date(user.created_at))) {
			return NextResponse.json(
				{ error: "認証トークンの有効期限が切れています" },
				{ status: 400 },
			);
		}

		// ユーザーを認証済みにマーク
		const { error: updateError } = await supabase
			.from("User")
			.update({
				is_email_verified: true,
				verification_token: null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", user.id);

		if (updateError) {
			return NextResponse.json(
				{ error: "認証の更新に失敗しました" },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{ message: "メールアドレスの認証が完了しました" },
			{ status: 200 },
		);
	} catch (_error) {
		return NextResponse.json(
			{ error: "メール認証に失敗しました" },
			{ status: 500 },
		);
	}
}

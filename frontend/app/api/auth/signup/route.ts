import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { generateVerificationToken, hashPassword } from "@/lib/utils/auth";
import { sendVerificationEmail } from "@/lib/utils/email";
import { signUpSchema } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = signUpSchema.parse(body);
		const { email, password, username } = validatedData;

		const supabase = getServiceRoleSupabase();

		// ユーザーが既に存在するかチェック
		const { data: existingUser } = await supabase
			.from("User")
			.select("email")
			.eq("email", email)
			.single();

		if (existingUser) {
			return NextResponse.json(
				{ error: "このメールアドレスは既に登録されています" },
				{ status: 400 },
			);
		}

		// ユーザー名の重複チェック
		const { data: existingUsername } = await supabase
			.from("User")
			.select("username")
			.eq("username", username)
			.single();

		if (existingUsername) {
			return NextResponse.json(
				{ error: "このユーザー名は既に使用されています" },
				{ status: 400 },
			);
		}

		// パスワードをハッシュ化
		const hashedPassword = await hashPassword(password);

		// 認証トークンを生成
		const verificationToken = generateVerificationToken();

		// ユーザーを作成（まだ未認証）
		const { data: newUser, error: createError } = await supabase
			.from("User")
			.insert({
				email,
				password_hash: hashedPassword,
				username,
				language: "ja",
				verification_token: verificationToken,
				is_email_verified: false,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.select()
			.single();

		if (createError) {
			return NextResponse.json(
				{ error: "ユーザーの作成に失敗しました" },
				{ status: 500 },
			);
		}

		try {
			await sendVerificationEmail({
				email,
				username,
				verificationToken,
			});
		} catch (emailError) {
			// ユーザーは作成されたが、メール送信に失敗した場合は警告を返す
			return NextResponse.json(
				{
					message:
						"アカウントが作成されましたが、認証メールの送信に失敗しました。しばらくしてからもう一度お試しください。",
					userId: newUser.id,
				},
				{ status: 201 },
			);
		}

		return NextResponse.json(
			{
				message: "アカウントが作成されました。認証メールを確認してください。",
				userId: newUser.id,
			},
			{ status: 201 },
		);
	} catch (error) {
		return NextResponse.json(
			{ error: "新規登録に失敗しました" },
			{ status: 500 },
		);
	}
}

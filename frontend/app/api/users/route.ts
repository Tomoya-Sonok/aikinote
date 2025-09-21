import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { generateVerificationToken } from "@/lib/utils/auth-server";
import { sendVerificationEmail } from "@/lib/utils/email";
import {
	createSuccessResponse,
	createValidationErrorResponse,
	createInternalServerErrorResponse,
	handleApiError,
} from "@/lib/utils/api-response";

export async function POST(request: Request) {
	const supabase = getServiceRoleSupabase();

	try {
		const {
			id,
			email,
			username,
			dojo_id: dojoId = null,
		} = await request.json();

		if (!id || !email || !username) {
			return createValidationErrorResponse({
				id: id ? [] : ["IDは必須です"],
				email: email ? [] : ["メールアドレスは必須です"],
				username: username ? [] : ["ユーザー名は必須です"],
			});
		}

		const verificationToken = generateVerificationToken();

		const { data: insertedUser, error: insertError } = await supabase
			.from("User")
			.insert({
				id,
				email,
				username,
				profile_image_url: null,
				dojo_id: dojoId,
				training_start_date: null,
				publicity_setting: "private",
				language: "ja",
				is_email_verified: false,
				verification_token: verificationToken,
				password_hash: "",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.select("id, email, username")
			.single();

		if (insertError) {
			await supabase.auth.admin.deleteUser(id);

			// 重複エラーの場合は適切なエラーコードを返す
			if (
				insertError.message.includes("duplicate") ||
				insertError.message.includes("unique")
			) {
				return createValidationErrorResponse(
					"既に登録済みのメールアドレスまたはユーザー名です",
				);
			}

			return createInternalServerErrorResponse(insertError.message);
		}

		try {
			await sendVerificationEmail({
				email,
				username,
				verificationToken,
			});
		} catch {
			await supabase.from("User").delete().eq("id", id);
			await supabase.auth.admin.deleteUser(id);

			return createInternalServerErrorResponse(
				"認証メールの送信に失敗しました。しばらくしてからもう一度お試しください。",
			);
		}

		// ユーザータグの初期化
		await initializeUserTagsIfNeeded(id);

		return createSuccessResponse(insertedUser, {
			message: "ユーザー登録が完了しました。認証メールを確認してください。",
		});
	} catch (error) {
		return handleApiError(error, "POST /api/users");
	}
}

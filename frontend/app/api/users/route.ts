import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { generateVerificationToken, hashPassword } from "@/lib/utils/auth-server";
import { sendVerificationEmail } from "@/lib/utils/email";
import {
	createSuccessResponse,
	createValidationErrorResponse,
	createInternalServerErrorResponse,
	handleApiError,
} from "@/lib/utils/api-response";
import { z } from "zod";

const signUpSchema = z.object({
	email: z
		.string()
		.email("メールアドレスの形式が正しくありません"),
	password: z
		.string()
		.min(8, "パスワードは8文字以上で入力してください"),
	username: z.string().min(1, "ユーザー名は必須です"),
});

function formatZodErrors(error: z.ZodError) {
	const fieldErrors = error.flatten().fieldErrors;
	const filteredEntries = Object.entries(fieldErrors)
		.filter(([, messages]) => messages && messages.length > 0)
		.map(([field, messages]) => [field, messages ?? []]);

	return Object.fromEntries(filteredEntries) as Record<string, string[]>;
}

export async function POST(request: Request) {
	const supabase = getServiceRoleSupabase();

	try {
		const body = await request.json();
		const parsed = signUpSchema.safeParse(body);

		if (!parsed.success) {
			return createValidationErrorResponse(formatZodErrors(parsed.error));
		}

		const { email, password, username } = parsed.data;

		// 既存メールチェック
		const { data: existingEmail, error: emailError } = await supabase
			.from("User")
			.select("id")
			.eq("email", email)
			.maybeSingle();

		if (emailError) {
			return createInternalServerErrorResponse(emailError);
		}

		if (existingEmail) {
			return createValidationErrorResponse({
				email: ["既に登録済みのメールアドレスです"],
			});
		}

		// 既存ユーザー名チェック
		const { data: existingUsername, error: usernameError } = await supabase
			.from("User")
			.select("id")
			.eq("username", username)
			.maybeSingle();

		if (usernameError) {
			return createInternalServerErrorResponse(usernameError);
		}

		if (existingUsername) {
			return createValidationErrorResponse({
				username: ["このユーザー名は既に使用されています"],
			});
		}

		const verificationToken = generateVerificationToken();
		const passwordHash = await hashPassword(password);

		let createdUserId: string | null = null;
		let userInserted = false;

		try {
			const { data: createdUser, error: createUserError } =
				await supabase.auth.admin.createUser({
					email,
					password,
					email_confirm: false,
					user_metadata: {
						username,
					},
				});

			if (createUserError || !createdUser?.user) {
				const errorMessage = createUserError?.message ?? "ユーザー作成に失敗しました";

				if (errorMessage.includes("email")) {
					return createValidationErrorResponse({
						email: ["既に登録済みのメールアドレスです"],
					});
				}

				return createInternalServerErrorResponse(errorMessage);
			}

			createdUserId = createdUser.user.id;

			const { data: insertedUser, error: insertError } = await supabase
				.from("User")
				.insert({
					id: createdUserId,
					email,
					username,
					profile_image_url: null,
					training_start_date: null,
					publicity_setting: "private",
					language: "ja",
					is_email_verified: false,
					verification_token: verificationToken,
					password_hash: passwordHash,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.select("id, email, username")
				.single();

			if (insertError) {
				await supabase.auth.admin.deleteUser(createdUserId);

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

			userInserted = true;

			try {
				await sendVerificationEmail({
					email,
					username,
					verificationToken,
				});
			} catch (emailError) {
				await supabase.from("User").delete().eq("id", createdUserId);
				await supabase.auth.admin.deleteUser(createdUserId);

				return createInternalServerErrorResponse(
					emailError instanceof Error
						? emailError
						: "認証メールの送信に失敗しました。しばらくしてからもう一度お試しください。",
				);
			}

			await initializeUserTagsIfNeeded(createdUserId);

			return createSuccessResponse(insertedUser, {
				message: "ユーザー登録が完了しました。認証メールを確認してください。",
			});
		} catch (error) {
			if (createdUserId) {
				if (userInserted) {
					await supabase.from("User").delete().eq("id", createdUserId);
				}
				await supabase.auth.admin.deleteUser(createdUserId);
			}

			throw error;
		}
	} catch (error) {
		return handleApiError(error, "POST /api/users");
	}
}

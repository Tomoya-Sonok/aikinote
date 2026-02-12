import { z } from "zod";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  handleApiError,
} from "@/lib/utils/api-response";
import {
  generateVerificationToken,
  verifyPassword,
} from "@/lib/utils/auth-server";
import { sendEmailChangeEmail } from "@/lib/utils/email";

const requestSchema = z.object({
  newEmail: z.string().email("メールアドレスの形式が正しくありません"),
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
});

function formatZodErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  const filteredEntries = Object.entries(fieldErrors)
    .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
    .map(([field, messages]) => [field, messages ?? []]);

  return Object.fromEntries(filteredEntries) as Record<string, string[]>;
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await getServerSupabase();
    const {
      data: { session },
    } = await serverSupabase.auth.getSession();

    if (!session?.user) {
      return createUnauthorizedResponse("認証が必要です");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
      return createBadRequestResponse();
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationErrorResponse(formatZodErrors(parsed.error));
    }

    const { newEmail, currentPassword } = parsed.data;
    const serviceSupabase = getServiceRoleSupabase();

    const { data: user, error: userError } = await serviceSupabase
      .from("User")
      .select("id, email, username, password_hash")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError) {
      return createInternalServerErrorResponse(userError);
    }

    if (!user) {
      return createNotFoundResponse("ユーザーが見つかりません");
    }

    if (!user.password_hash) {
      return createValidationErrorResponse({
        currentPassword: ["パスワードが未設定のため変更できません"],
      });
    }

    const isValidPassword = await verifyPassword(
      currentPassword,
      user.password_hash,
    );

    if (!isValidPassword) {
      return createValidationErrorResponse({
        currentPassword: ["パスワードが正しくありません"],
      });
    }

    if (newEmail === user.email) {
      return createValidationErrorResponse({
        newEmail: ["現在のメールアドレスと同じです"],
      });
    }

    const { data: existingUser, error: existingError } = await serviceSupabase
      .from("User")
      .select("id")
      .or(`email.eq.${newEmail},pending_email.eq.${newEmail}`)
      .neq("id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return createInternalServerErrorResponse(existingError);
    }

    if (existingUser) {
      return createValidationErrorResponse({
        newEmail: ["既に使用されているメールアドレスです"],
      });
    }

    const emailChangeToken = generateVerificationToken();
    const requestedAt = new Date().toISOString();

    const { error: updateError } = await serviceSupabase
      .from("User")
      .update({
        pending_email: newEmail,
        email_change_token: emailChangeToken,
        email_change_requested_at: requestedAt,
        updated_at: requestedAt,
      })
      .eq("id", user.id);

    if (updateError) {
      return createInternalServerErrorResponse(updateError);
    }

    try {
      await sendEmailChangeEmail({
        email: newEmail,
        username: user.username,
        emailChangeToken,
      });
    } catch (error) {
      await serviceSupabase
        .from("User")
        .update({
          pending_email: null,
          email_change_token: null,
          email_change_requested_at: null,
          updated_at: requestedAt,
        })
        .eq("id", user.id);

      return createInternalServerErrorResponse(
        error instanceof Error ? error : "メール送信に失敗しました",
      );
    }

    return createSuccessResponse(
      { pendingEmail: newEmail },
      { message: "確認メールを送信しました" },
    );
  } catch (error) {
    return handleApiError(error, "POST /api/auth/request-email-change");
  }
}

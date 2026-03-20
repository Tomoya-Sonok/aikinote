import { z } from "zod";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createSuccessResponse,
  handleApiError,
} from "@/lib/utils/api-response";
import { generateResetToken } from "@/lib/utils/auth-server";
import { sendPasswordResetEmail } from "@/lib/utils/email";

const requestSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
      return createBadRequestResponse();
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return createBadRequestResponse("メールアドレスの形式が正しくありません");
    }

    const { email } = parsed.data;
    const supabase = getServiceRoleSupabase();
    const resetToken = generateResetToken();
    const requestedAt = new Date().toISOString();

    // SELECT + UPDATE を1クエリで実行
    const { data: user, error: updateError } = await supabase
      .from("User")
      .update({
        reset_token: resetToken,
        reset_token_created_at: requestedAt,
        updated_at: requestedAt,
      })
      .eq("email", email)
      .select("id, email")
      .maybeSingle();

    if (updateError) {
      console.error("forgot-password: トークン保存エラー", updateError);
      return createInternalServerErrorResponse(updateError.message);
    }

    // ユーザーが存在しない場合でも成功レスポンスを返す（メール列挙攻撃防止）
    if (!user) {
      return createSuccessResponse(null, {
        message: "パスワードリセットメールを送信しました",
      });
    }

    try {
      await sendPasswordResetEmail({ email: user.email, resetToken });
    } catch (error) {
      // メール送信失敗時はトークンをクリア
      const { error: rollbackError } = await supabase
        .from("User")
        .update({
          reset_token: null,
          reset_token_created_at: null,
          updated_at: requestedAt,
        })
        .eq("id", user.id);

      if (rollbackError) {
        console.error("forgot-password: ロールバック失敗", rollbackError);
      }

      return createInternalServerErrorResponse(
        error instanceof Error ? error : "メール送信に失敗しました",
      );
    }

    return createSuccessResponse(null, {
      message: "パスワードリセットメールを送信しました",
    });
  } catch (error) {
    return handleApiError(error, "POST /api/auth/forgot-password");
  }
}

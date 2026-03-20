import { z } from "zod";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createSuccessResponse,
  createValidationErrorResponse,
  handleApiError,
} from "@/lib/utils/api-response";
import { hashPassword, isTokenExpired } from "@/lib/utils/auth-server";

const requestSchema = z.object({
  token: z.string().min(1, "トークンが必要です"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
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
      return createBadRequestResponse("入力内容に誤りがあります");
    }

    const { token, password } = parsed.data;
    const supabase = getServiceRoleSupabase();

    // DB検索とパスワードハッシュ化を並列実行
    const [userResult, hashedPassword] = await Promise.all([
      supabase
        .from("User")
        .select("id, reset_token_created_at")
        .eq("reset_token", token)
        .maybeSingle(),
      hashPassword(password),
    ]);

    const { data: user, error: findError } = userResult;

    if (findError || !user) {
      console.error("reset-password: ユーザー取得エラー", {
        findError,
        token: `${token.slice(0, 8)}...`,
      });
      return createValidationErrorResponse("無効なリセットトークンです");
    }

    if (
      !user.reset_token_created_at ||
      isTokenExpired(new Date(user.reset_token_created_at))
    ) {
      return createValidationErrorResponse(
        "リセットトークンの有効期限が切れています",
      );
    }

    // Supabase Auth のパスワードを先に更新（認証ゲートのため優先）
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password },
    );

    if (authUpdateError) {
      console.error("reset-password: Supabase Auth更新エラー", authUpdateError);
      return createInternalServerErrorResponse("認証情報の更新に失敗しました");
    }

    const updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("User")
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_created_at: null,
        updated_at: updatedAt,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("reset-password: User テーブル更新エラー", updateError);
      return createInternalServerErrorResponse(
        "パスワードの更新に失敗しました",
      );
    }

    return createSuccessResponse(null, {
      message: "パスワードが正常に変更されました",
    });
  } catch (error) {
    return handleApiError(error, "POST /api/auth/reset-password");
  }
}

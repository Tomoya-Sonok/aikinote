import { NextRequest } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import {
  createInternalServerErrorResponse,
  createSuccessResponse,
  createValidationErrorResponse,
  handleApiError,
} from "@/lib/utils/api-response";
import { isTokenExpired } from "@/lib/utils/auth-server";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return createValidationErrorResponse("認証トークンが提供されていません");
    }

    const supabase = getServiceRoleSupabase();

    const { data: user, error: findError } = await supabase
      .from("User")
      .select(
        "id, email, pending_email, email_change_requested_at, is_email_verified",
      )
      .eq("email_change_token", token)
      .maybeSingle();

    if (findError || !user) {
      console.error("confirm-email-change: ユーザー取得エラー", {
        findError,
        token: `${token.slice(0, 8)}...`,
      });
      return createValidationErrorResponse("無効な認証トークンです");
    }

    if (!user.pending_email) {
      return createValidationErrorResponse(
        "変更先メールアドレスが見つかりません",
      );
    }

    if (
      !user.email_change_requested_at ||
      isTokenExpired(new Date(user.email_change_requested_at))
    ) {
      return createValidationErrorResponse(
        "認証トークンの有効期限が切れています",
      );
    }

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email: user.pending_email,
        email_confirm: true,
      },
    );

    if (authUpdateError) {
      console.error("confirm-email-change: auth更新エラー", authUpdateError);
      return createInternalServerErrorResponse("認証情報の更新に失敗しました");
    }

    const updatedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("User")
      .update({
        email: user.pending_email,
        pending_email: null,
        email_change_token: null,
        email_change_requested_at: null,
        is_email_verified: true,
        updated_at: updatedAt,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("confirm-email-change: User更新エラー", updateError);

      try {
        await supabase.auth.admin.updateUserById(user.id, {
          email: user.email,
          email_confirm: true,
        });
      } catch (rollbackError) {
        console.error(
          "confirm-email-change: authロールバック失敗",
          rollbackError,
        );
      }

      return createInternalServerErrorResponse(
        "メールアドレスの更新に失敗しました",
      );
    }

    return createSuccessResponse(
      { email: user.pending_email },
      { message: "メールアドレスの変更が完了しました" },
    );
  } catch (error) {
    return handleApiError(error, "POST /api/auth/confirm-email-change");
  }
}

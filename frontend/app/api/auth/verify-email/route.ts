import { NextRequest } from "next/server";

import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { isTokenExpired } from "@/lib/utils/auth-server";
import {
  createSuccessResponse,
  createValidationErrorResponse,
  createInternalServerErrorResponse,
  handleApiError,
} from "@/lib/utils/api-response";

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
      .select("id, email, is_email_verified, verification_token, created_at")
      .eq("verification_token", token)
      .maybeSingle(); // singleの代わりにmaybeSingleを使用

    if (findError || !user) {
      console.error("verify-email: ユーザー取得エラー", { findError, token: `${token.slice(0, 8)}...` });
      return createValidationErrorResponse("無効な認証トークンです");
    }

    if (user.is_email_verified) {
      return createSuccessResponse(null, {
        message: "このアカウントは既に認証済みです"
      });
    }

    if (isTokenExpired(new Date(user.created_at))) {
      return createValidationErrorResponse("認証トークンの有効期限が切れています");
    }

    const { error: updateError } = await supabase
      .from("User")
      .update({
        is_email_verified: true,
        verification_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return createInternalServerErrorResponse("認証の更新に失敗しました");
    }

    try {
      await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
    } catch (adminError) {
      console.error("Supabase admin email confirm error", adminError);
    }

    return createSuccessResponse(null, {
      message: "メールアドレスの認証が完了しました"
    });
  } catch (error) {
    return handleApiError(error, "POST /api/auth/verify-email");
  }
}

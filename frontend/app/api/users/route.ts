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
  console.log("=== /api/users POST request received ===");
  console.log("Request URL:", request.url);
  console.log("Request headers:", Object.fromEntries(request.headers.entries()));
  console.log("Stack trace:", new Error().stack?.split('\n').slice(0, 8));

  const supabase = getServiceRoleSupabase();

  try {
    const {
      id,
      email,
      username,
      dojo_id: dojoId = null,
    } = await request.json();

    console.log("[api/users] request payload", {
      id,
      email,
      username,
      dojoId,
    });

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
      console.error("[api/users] user insert failed", insertError);

      // 重複エラーの場合は適切なエラーコードを返す
      if (insertError.message.includes("duplicate") || insertError.message.includes("unique")) {
        return createValidationErrorResponse("既に登録済みのメールアドレスまたはユーザー名です");
      }

      return createInternalServerErrorResponse(insertError.message);
    }

    console.log("[api/users] user inserted", insertedUser);

    try {
      console.log("[api/users] sending verification email", {
        email,
        username,
        verificationToken: `${verificationToken.slice(0, 8)}...`,
      });
      await sendVerificationEmail({
        email,
        username,
        verificationToken,
      });
      console.log("[api/users] verification email sent successfully", email);
    } catch (emailError) {
      console.error("認証メール送信エラー:", emailError);

      await supabase.from("User").delete().eq("id", id);
      try {
        await supabase.auth.admin.deleteUser(id);
      } catch (cleanupError) {
        console.error("Supabase auth cleanup error:", cleanupError);
      }

      return createInternalServerErrorResponse(
        "認証メールの送信に失敗しました。しばらくしてからもう一度お試しください。"
      );
    }

    const tagResult = await initializeUserTagsIfNeeded(id);
    if (!tagResult.success) {
      console.error("初期タグ作成に失敗しました", tagResult.error);
    }
    console.log("[api/users] initialized tags", {
      success: tagResult.success,
      count: tagResult.data?.length,
    });

    return createSuccessResponse(insertedUser, {
      message: "ユーザー登録が完了しました。認証メールを確認してください。"
    });
  } catch (error) {
    return handleApiError(error, "POST /api/users");
  }
}

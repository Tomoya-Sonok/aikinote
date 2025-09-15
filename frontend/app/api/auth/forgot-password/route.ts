import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { generateResetToken } from "@/lib/utils/auth";
import { sendPasswordResetEmail } from "@/lib/utils/email";
import { resetPasswordSchema } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);
    const { email } = validatedData;

    const supabase = getServiceRoleSupabase();

    // ユーザーが存在するかチェック
    const { data: user, error: findError } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .single();

    if (findError || !user) {
      // セキュリティのため、ユーザーが存在しない場合でも同じメッセージを返す
      return NextResponse.json(
        {
          message:
            "パスワードリセットメールを送信しました（該当するアカウントが存在する場合）",
        },
        { status: 200 },
      );
    }

    // リセットトークンを生成
    const resetToken = generateResetToken();

    // ユーザーにリセットトークンを保存
    const { error: updateError } = await supabase
      .from("User")
      .update({
        reset_token: resetToken,
        reset_token_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("リセットトークン更新エラー:", updateError);
      return NextResponse.json(
        { error: "パスワードリセットの準備に失敗しました" },
        { status: 500 },
      );
    }

    // パスワードリセットメールを送信
    try {
      await sendPasswordResetEmail({
        email,
        resetToken,
      });
    } catch (emailError) {
      console.error("パスワードリセットメール送信エラー:", emailError);
      return NextResponse.json(
        { error: "パスワードリセットメールの送信に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "パスワードリセットメールを送信しました" },
      { status: 200 },
    );
  } catch (error) {
    console.error("パスワードリセット要求エラー:", error);
    return NextResponse.json(
      { error: "パスワードリセット要求に失敗しました" },
      { status: 500 },
    );
  }
}

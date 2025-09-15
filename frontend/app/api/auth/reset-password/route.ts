import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { hashPassword, isTokenExpired } from "@/lib/utils/auth";
import { newPasswordSchema } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token) {
      return NextResponse.json(
        { error: "リセットトークンが提供されていません" },
        { status: 400 },
      );
    }

    // パスワードのバリデーション
    const validatedData = newPasswordSchema.parse({
      password,
      confirmPassword,
    });

    const supabase = getServiceRoleSupabase();

    // トークンでユーザーを検索
    const { data: user, error: findError } = await supabase
      .from("User")
      .select("*")
      .eq("reset_token", token)
      .single();

    if (findError || !user) {
      return NextResponse.json(
        { error: "無効なリセットトークンです" },
        { status: 400 },
      );
    }

    // トークンの有効期限をチェック
    if (
      user.reset_token_created_at &&
      isTokenExpired(new Date(user.reset_token_created_at))
    ) {
      return NextResponse.json(
        { error: "リセットトークンの有効期限が切れています" },
        { status: 400 },
      );
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await hashPassword(validatedData.password);

    // パスワードを更新してリセットトークンをクリア
    const { error: updateError } = await supabase
      .from("User")
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_created_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("パスワード更新エラー:", updateError);
      return NextResponse.json(
        { error: "パスワードの更新に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "パスワードが正常に更新されました" },
      { status: 200 },
    );
  } catch (error) {
    console.error("パスワードリセットエラー:", error);
    return NextResponse.json(
      { error: "パスワードリセットに失敗しました" },
      { status: 500 },
    );
  }
}

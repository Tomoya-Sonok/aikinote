import { NextRequest, NextResponse } from "next/server";

import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { isTokenExpired } from "@/lib/utils/auth-server";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "認証トークンが提供されていません" },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();

    const { data: user, error: findError } = await supabase
      .from("User")
      .select("id, email, is_email_verified, verification_token, created_at")
      .eq("verification_token", token)
      .single();

    if (findError || !user) {
      return NextResponse.json(
        { error: "無効な認証トークンです" },
        { status: 400 },
      );
    }

    if (user.is_email_verified) {
      return NextResponse.json(
        { message: "このアカウントは既に認証済みです" },
        { status: 200 },
      );
    }

    if (isTokenExpired(new Date(user.created_at))) {
      return NextResponse.json(
        { error: "認証トークンの有効期限が切れています" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "認証の更新に失敗しました" },
        { status: 500 },
      );
    }

    try {
      await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
    } catch (adminError) {
      console.error("Supabase admin email confirm error", adminError);
    }

    return NextResponse.json(
      { message: "メールアドレスの認証が完了しました" },
      { status: 200 },
    );
  } catch (error) {
    console.error("verify-email error", error);
    return NextResponse.json(
      { error: "メール認証に失敗しました" },
      { status: 500 },
    );
  }
}

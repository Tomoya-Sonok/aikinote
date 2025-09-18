import { NextResponse } from "next/server";

import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { generateVerificationToken } from "@/lib/utils/auth-server";
import { sendVerificationEmail } from "@/lib/utils/email";

export async function POST(request: Request) {
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
      return NextResponse.json(
        {
          success: false,
          error: "id, email, username は必須です",
        },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 },
      );
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

      return NextResponse.json(
        {
          success: false,
          error:
            "認証メールの送信に失敗しました。しばらくしてからもう一度お試しください。",
        },
        { status: 500 },
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

    return NextResponse.json({
      success: true,
      data: insertedUser,
    });
  } catch (error) {
    console.error("/api/users POST error", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "未知のエラーが発生しました",
      },
      { status: 500 },
    );
  }
}

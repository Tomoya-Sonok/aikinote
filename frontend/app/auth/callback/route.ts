import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { generateVerificationToken } from "@/lib/utils/auth-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      },
    );

    try {
      // 認証コードをセッションに交換
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("認証コード交換エラー:", error);
        return NextResponse.redirect(
          new URL("/login?error=auth_error", requestUrl.origin),
        );
      }
      // 新規ユーザーの場合、データベースにユーザー情報を作成
      if (data?.user?.email) {
        try {
          const serviceSupabase = getServiceRoleSupabase();

          // ユーザーが既に存在するかチェック（直接データベースアクセス）
          const { data: existingUser, error: selectError } =
            await serviceSupabase
              .from("User")
              .select("id, email, username")
              .eq("id", data.user.id)
              .maybeSingle();

          if (selectError) {
            console.error("ユーザー存在チェックエラー:", selectError);
            // エラーがあってもリダイレクトは続行
          } else if (!existingUser) {
            // ユーザーが存在しない場合、新規作成

            // usernameを生成 (emailのローカル部分を使用)
            const username = data.user.email.split("@")[0];
            const verificationToken = generateVerificationToken();

            const { data: insertedUser, error: insertError } =
              await serviceSupabase
                .from("User")
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  username: username,
                  profile_image_url: null,
                  training_start_date: null,
                  publicity_setting: "private",
                  language: "ja",
                  is_email_verified: true, // OAuth認証の場合は既にメール確認済み
                  verification_token: verificationToken,
                  password_hash: "",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select("id, email, username")
                .single();

            if (insertError) {
              console.error("ユーザー作成エラー:", insertError);
              // エラーがあってもリダイレクトは続行
            } else {
              // ユーザータグ初期化（エラーが発生してもリダイレクトは続行）
              await initializeUserTagsIfNeeded(data.user.id);
            }
          } else {
            console.log("ユーザーは既に存在します:", data.user.email);
          }
        } catch (userCreationError) {
          console.error("ユーザー作成処理でエラー:", userCreationError);
          // エラーがあってもリダイレクトは続行
        }
      }

      // 認証成功時は元のリダイレクト先にリダイレクト
      return NextResponse.redirect(
        new URL("/personal/pages", requestUrl.origin),
      );
    } catch (error) {
      console.error("認証処理エラー:", error);
      return NextResponse.redirect(
        new URL("/login?error=auth_error", requestUrl.origin),
      );
    }
  }

  // コードがない場合はログインページにリダイレクト
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
